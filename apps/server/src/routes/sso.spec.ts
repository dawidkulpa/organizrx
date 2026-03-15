import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'
import { Hono } from 'hono'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import { _clearSettingsCache, setSetting } from '../services/settings'
import { createAccessToken, toAuthUser } from '../services/auth'

const buildToken = mock((opts: { id: number; group_id: number; username: string }) =>
  createAccessToken(
    toAuthUser({
      id: opts.id,
      username: opts.username,
      email: `${opts.username}@test.local`,
      groupName: opts.group_id === 0 ? 'Admin' : 'User',
      group_id: opts.group_id,
      image: null,
    })
  )
)

function uniqueDbPath(suffix = 'sso-routes'): string {
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
    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      value TEXT
    )
  `)

  return db
}

async function createApp(): Promise<Hono> {
  const { default: ssoRoutes } = await import('./sso')
  const app = new Hono()
  app.route('/api/sso', ssoRoutes)
  return app
}

describe('sso routes', () => {
  beforeEach(async () => {
    await closeDb()
    _clearSettingsCache()
    buildToken.mockClear()
  })

  afterEach(async () => {
    await closeDb()
    _clearSettingsCache()
  })

  describe('GET /api/sso/services', () => {
    it('returns 200 with services list for admin', async () => {
      await setupDb()
      const adminToken = await buildToken({ id: 1, group_id: 0, username: 'admin' })
      const app = await createApp()

      const res = await app.request('/api/sso/services', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(Array.isArray(json.data.services)).toBe(true)
      expect(json.data.services.length).toBeGreaterThan(0)
    })

    it('returns 403 for non-admin user', async () => {
      await setupDb()
      const userToken = await buildToken({ id: 2, group_id: 4, username: 'user' })
      const app = await createApp()

      const res = await app.request('/api/sso/services', {
        headers: { Authorization: `Bearer ${userToken}` },
      })
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('returns 401 when not authenticated', async () => {
      await setupDb()
      const app = await createApp()

      const res = await app.request('/api/sso/services')
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('GET /api/sso/config', () => {
    it('returns 200 with config for admin', async () => {
      await setupDb()
      const adminToken = await buildToken({ id: 1, group_id: 0, username: 'admin' })
      const app = await createApp()

      const res = await app.request('/api/sso/config', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(Array.isArray(json.data.config)).toBe(true)
      expect(json.data.config.length).toBeGreaterThan(0)
    })

    it('returns 403 for non-admin', async () => {
      await setupDb()
      const userToken = await buildToken({ id: 2, group_id: 4, username: 'user' })
      const app = await createApp()

      const res = await app.request('/api/sso/config', {
        headers: { Authorization: `Bearer ${userToken}` },
      })
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('returns 401 when not authenticated', async () => {
      await setupDb()
      const app = await createApp()

      const res = await app.request('/api/sso/config')
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('PUT /api/sso/config', () => {
    it('returns 200 when admin updates config', async () => {
      await setupDb()
      await setSetting('sso_enabled', '1')

      const adminToken = await buildToken({ id: 1, group_id: 0, username: 'admin' })
      const app = await createApp()

      const res = await app.request('/api/sso/config', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service: 'plex',
          enabled: true,
          cookie_name: 'MyPlexToken',
          cookie_domain: '.example.local',
          cookie_path: '/plex',
        }),
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.service.name).toBe('plex')
      expect(json.data.service.cookie_name).toBe('MyPlexToken')
    })

    it('returns 400 INVALID_SERVICE for unknown service', async () => {
      await setupDb()
      const adminToken = await buildToken({ id: 1, group_id: 0, username: 'admin' })
      const app = await createApp()

      const res = await app.request('/api/sso/config', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ service: 'unknown-service', enabled: true }),
      })
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('INVALID_SERVICE')
    })

    it('returns 403 for non-admin', async () => {
      await setupDb()
      const userToken = await buildToken({ id: 2, group_id: 4, username: 'user' })
      const app = await createApp()

      const res = await app.request('/api/sso/config', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ service: 'plex', enabled: true }),
      })
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('returns 401 when not authenticated', async () => {
      await setupDb()
      const app = await createApp()

      const res = await app.request('/api/sso/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: 'plex', enabled: true }),
      })
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('GET /api/sso/cookies', () => {
    it('returns 200 with cookies and serialized headers for authenticated user', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO users (id, username, password, email, plex_token, "group", group_id, locked)
        VALUES (5, 'user', 'hash', 'user@test.local', 'plex-token-123', 'User', 4, 0)
      `)

      await setSetting('sso_enabled', '1')
      await setSetting('sso_plex_enabled', '1')

      const userToken = await buildToken({ id: 5, group_id: 4, username: 'user' })
      const app = await createApp()

      const res = await app.request('/api/sso/cookies', {
        headers: { Authorization: `Bearer ${userToken}` },
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(Array.isArray(json.data.cookies)).toBe(true)
      expect(Array.isArray(json.data.headers)).toBe(true)
      expect(json.data.cookies.length).toBe(1)
      expect(json.data.cookies[0].name).toBe('X-Plex-Token')
      expect(json.data.headers[0]).toContain('X-Plex-Token=plex-token-123')
    })

    it('returns 401 when not authenticated', async () => {
      await setupDb()
      const app = await createApp()

      const res = await app.request('/api/sso/cookies')
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })
  })
})
