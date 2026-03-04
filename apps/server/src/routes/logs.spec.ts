import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { Hono } from 'hono'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import { _clearSettingsCache } from '../services/settings'
import logs from './logs'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniqueDbPath(suffix = 'logs-routes'): string {
  const dir = join(tmpdir(), 'organizrx-test-' + process.pid)
  mkdirSync(dir, { recursive: true })
  return join(dir, `test-${suffix}-${Date.now()}.db`)
}

async function setupDb() {
  _resetConfig()
  await initConfig()
  const dbPath = uniqueDbPath()
  await initDb({ dialect: 'sqlite', url: dbPath })

  const db = getRawDb() as SqliteDb

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      email TEXT,
      plex_token TEXT,
      "group" TEXT,
      group_id INTEGER,
      locked INTEGER,
      image TEXT,
      register_date TEXT,
      auth_service TEXT DEFAULT 'internal',
      totp_secret TEXT,
      totp_enabled INTEGER DEFAULT 0,
      totp_backup_codes TEXT
    )
  `)

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "group" TEXT UNIQUE,
      group_id INTEGER,
      image TEXT,
      "default" INTEGER
    )
  `)

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE,
      user_id INTEGER,
      browser TEXT,
      ip TEXT,
      created TEXT,
      expires TEXT
    )
  `)

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      value TEXT
    )
  `)

  // Seed groups
  db.$client.exec(`INSERT INTO groups (id, "group", group_id, "default") VALUES (1, 'Admin', 0, 0)`)
  db.$client.exec(`INSERT INTO groups (id, "group", group_id, "default") VALUES (4, 'User', 4, 1)`)

  return db
}

function createApp(): Hono {
  const app = new Hono()
  app.route('/api/logs', logs)
  return app
}

async function createAdminJwt(): Promise<string> {
  const { createAccessToken, toAuthUser } = await import('../services/auth')
  const authUser = toAuthUser({
    id: 1,
    username: 'admin',
    email: 'admin@test.com',
    groupName: 'Admin',
    group_id: 0,
    image: null,
  })
  return createAccessToken(authUser)
}

async function createUserJwt(): Promise<string> {
  const { createAccessToken, toAuthUser } = await import('../services/auth')
  const authUser = toAuthUser({
    id: 2,
    username: 'testuser',
    email: 'user@test.com',
    groupName: 'User',
    group_id: 4,
    image: null,
  })
  return createAccessToken(authUser)
}

function getLogDir(): string {
  return join(process.cwd(), 'data', 'logs')
}

function createTestLogDir(): void {
  mkdirSync(getLogDir(), { recursive: true })
}

function cleanupLogDir(): void {
  try {
    rmSync(getLogDir(), { recursive: true, force: true })
  } catch {
    // Directory may not exist
  }
}

function writeTestLogFile(filename: string, entries: Record<string, unknown>[]): void {
  const content = entries.map((e) => JSON.stringify(e)).join('\n') + '\n'
  writeFileSync(join(getLogDir(), filename), content, 'utf-8')
}

// Sample NDJSON log entries
function sampleEntries() {
  return [
    { time: '2025-01-01T10:00:00.000Z', level: 'info', msg: 'Server started' },
    { time: '2025-01-01T10:01:00.000Z', level: 'warn', msg: 'Slow query detected' },
    { time: '2025-01-01T10:02:00.000Z', level: 'error', msg: 'Auth failed for user admin' },
    {
      time: '2025-01-01T10:03:00.000Z',
      level: 'info',
      msg: 'User login successful',
      component: 'auth',
    },
    { time: '2025-01-01T10:04:00.000Z', level: 'debug', msg: 'Cache invalidated' },
  ]
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('log routes', () => {
  beforeEach(async () => {
    await closeDb()
    _clearSettingsCache()
    cleanupLogDir()
    createTestLogDir()
  })

  afterEach(async () => {
    await closeDb()
    _clearSettingsCache()
    cleanupLogDir()
  })

  // -------------------------------------------------------------------------
  // GET /api/logs — list log entries
  // -------------------------------------------------------------------------

  describe('GET /api/logs', () => {
    it('should return paginated log entries', async () => {
      const db = await setupDb()
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      writeTestLogFile('app.log', sampleEntries())

      const jwt = await createAdminJwt()
      const app = createApp()

      const res = await app.request('/api/logs?page=1&limit=3', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data).toBeArray()
      expect(json.data.length).toBe(3)
      expect(json.meta.page).toBe(1)
      expect(json.meta.limit).toBe(3)
      expect(json.meta.total).toBe(5)
      expect(json.meta.pages).toBe(2)
    })

    it('should filter by level', async () => {
      const db = await setupDb()
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      writeTestLogFile('app.log', sampleEntries())

      const jwt = await createAdminJwt()
      const app = createApp()

      const res = await app.request('/api/logs?level=error', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.length).toBe(1)
      expect(json.data[0].msg).toBe('Auth failed for user admin')
    })

    it('should search by message content', async () => {
      const db = await setupDb()
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      writeTestLogFile('app.log', sampleEntries())

      const jwt = await createAdminJwt()
      const app = createApp()

      const res = await app.request('/api/logs?search=auth', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      // Should match "Auth failed..." (msg) and "User login..." (component: auth)
      expect(json.data.length).toBe(2)
    })

    it('should return empty when no log files exist', async () => {
      await setupDb()
      cleanupLogDir() // Remove the log dir entirely

      const jwt = await createAdminJwt()
      const app = createApp()

      const res = await app.request('/api/logs', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data).toBeArray()
      expect(json.data.length).toBe(0)
    })
  })

  // -------------------------------------------------------------------------
  // GET /api/logs/files — list log files
  // -------------------------------------------------------------------------

  describe('GET /api/logs/files', () => {
    it('should list log files with sizes', async () => {
      const db = await setupDb()
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      writeTestLogFile('app.log', sampleEntries())
      writeTestLogFile('app.1.log', [
        { time: '2025-01-01T09:00:00.000Z', level: 'info', msg: 'Old log' },
      ])

      const jwt = await createAdminJwt()
      const app = createApp()

      const res = await app.request('/api/logs/files', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data).toBeArray()
      expect(json.data.length).toBe(2)
      expect(json.data[0].filename).toBeDefined()
      expect(json.data[0].sizeBytes).toBeGreaterThan(0)
      expect(json.data[0].modifiedAt).toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // DELETE /api/logs — clear log files
  // -------------------------------------------------------------------------

  describe('DELETE /api/logs', () => {
    it('should clear all log files', async () => {
      const db = await setupDb()
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      writeTestLogFile('app.log', sampleEntries())
      writeTestLogFile('app.1.log', [
        { time: '2025-01-01T09:00:00.000Z', level: 'info', msg: 'Old log' },
      ])

      const jwt = await createAdminJwt()
      const app = createApp()

      const res = await app.request('/api/logs', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.deleted).toBe(2)

      // Verify files are gone
      const listRes = await app.request('/api/logs/files', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const listJson = await listRes.json()
      expect(listJson.data.length).toBe(0)
    })
  })

  // -------------------------------------------------------------------------
  // Auth requirements
  // -------------------------------------------------------------------------

  describe('Auth requirements', () => {
    it('should return 401 without auth', async () => {
      await setupDb()
      const app = createApp()

      const res = await app.request('/api/logs')
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 403 as non-admin', async () => {
      const db = await setupDb()
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (2, 'testuser', 'user@test.com', 'User', 4, 'internal', 0)
      `)

      const jwt = await createUserJwt()
      const app = createApp()

      const res = await app.request('/api/logs', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })
})
