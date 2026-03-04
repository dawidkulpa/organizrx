import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync, rmSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { Hono } from 'hono'
import AdmZip from 'adm-zip'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import { _clearSettingsCache } from '../services/settings'
import backup from './backup'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniqueDbPath(suffix = 'backup-routes'): string {
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

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS tabs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "order" INTEGER,
      category_id INTEGER,
      name TEXT,
      url TEXT,
      url_local TEXT,
      "default" INTEGER,
      enabled INTEGER,
      group_id INTEGER,
      group_id_max INTEGER DEFAULT 0,
      add_to_admin INTEGER DEFAULT 0,
      image TEXT,
      type INTEGER,
      splash INTEGER,
      ping INTEGER,
      ping_url TEXT,
      timeout INTEGER,
      timeout_ms INTEGER,
      preload INTEGER
    )
  `)

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "order" INTEGER,
      category TEXT,
      category_id INTEGER,
      image TEXT,
      "default" INTEGER
    )
  `)

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      date TEXT,
      email TEXT,
      username TEXT,
      dateused TEXT,
      usedby TEXT,
      ip TEXT,
      valid TEXT,
      type TEXT,
      invitedby TEXT
    )
  `)

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS chatroom (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      gravatar TEXT,
      uid TEXT,
      date TEXT,
      ip TEXT,
      message TEXT
    )
  `)

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS "BOOKMARK-categories" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "order" INTEGER,
      category TEXT UNIQUE,
      category_id INTEGER,
      "default" INTEGER
    )
  `)

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS "BOOKMARK-tabs" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "order" INTEGER,
      category_id INTEGER,
      name TEXT,
      url TEXT,
      enabled INTEGER,
      group_id INTEGER,
      image TEXT,
      background_color TEXT,
      text_color TEXT
    )
  `)

  // Insert default groups
  db.$client.exec(`
    INSERT INTO groups (id, "group", group_id, "default") VALUES (1, 'Admin', 0, 0)
  `)

  db.$client.exec(`
    INSERT INTO groups (id, "group", group_id, "default") VALUES (4, 'User', 4, 1)
  `)

  return db
}

function createApp(): Hono {
  const app = new Hono()
  app.route('/api/backup', backup)
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

function getTestBackupDir(): string {
  return join(process.cwd(), 'data', 'backups')
}

function cleanupBackupDir(): void {
  try {
    rmSync(getTestBackupDir(), { recursive: true, force: true })
  } catch {
    // Directory may not exist
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('backup routes', () => {
  beforeEach(async () => {
    await closeDb()
    _clearSettingsCache()
    cleanupBackupDir()
  })

  afterEach(async () => {
    await closeDb()
    _clearSettingsCache()
    cleanupBackupDir()
  })

  // -------------------------------------------------------------------------
  // POST /api/backup — create backup
  // -------------------------------------------------------------------------

  describe('POST /api/backup', () => {
    it('should create backup successfully as admin', async () => {
      const db = await setupDb()

      // Insert admin user
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      // Insert some test data
      db.$client.exec(`
        INSERT INTO tabs (id, name, url, enabled, group_id, category_id, "order")
        VALUES (1, 'Test Tab', 'https://test.com', 1, 0, 1, 1)
      `)

      db.$client.exec(`
        INSERT INTO options (name, value)
        VALUES ('title', 'OrganizrX')
      `)

      const jwt = await createAdminJwt()
      const app = createApp()

      const res = await app.request('/api/backup', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: 'Test backup' }),
      })
      const json = await res.json()

      expect(res.status).toBe(201)
      expect(json.data.filename).toMatch(/^organizrx-backup-.*\.zip$/)
      expect(json.data.createdAt).toBeDefined()
      expect(json.data.sizeBytes).toBeGreaterThan(0)
      expect(json.data.metadata.version).toBe('0.0.1')
      expect(json.data.metadata.dialect).toBe('sqlite')
      expect(json.data.metadata.tables).toBeArray()
      expect(json.data.metadata.description).toBe('Test backup')
    })

    it('should return 401 without auth', async () => {
      await setupDb()
      const app = createApp()

      const res = await app.request('/api/backup', { method: 'POST' })
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

      const res = await app.request('/api/backup', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })

  // -------------------------------------------------------------------------
  // GET /api/backup — list backups
  // -------------------------------------------------------------------------

  describe('GET /api/backup', () => {
    it('should list backups with metadata', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      const jwt = await createAdminJwt()
      const app = createApp()

      // Create a backup first
      await app.request('/api/backup', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      const res = await app.request('/api/backup', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data).toBeArray()
      expect(json.data.length).toBe(1)
      expect(json.data[0].filename).toMatch(/^organizrx-backup-.*\.zip$/)
      expect(json.data[0].metadata.version).toBe('0.0.1')
    })

    it('should return empty array when no backups exist', async () => {
      await setupDb()

      const jwt = await createAdminJwt()
      const app = createApp()

      const res = await app.request('/api/backup', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data).toBeArray()
      expect(json.data.length).toBe(0)
    })
  })

  // -------------------------------------------------------------------------
  // GET /api/backup/:id/download — download backup
  // -------------------------------------------------------------------------

  describe('GET /api/backup/:id/download', () => {
    it('should download a valid zip file', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      const jwt = await createAdminJwt()
      const app = createApp()

      // Create a backup first
      const createRes = await app.request('/api/backup', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      const createJson = await createRes.json()
      const filename = createJson.data.filename

      const res = await app.request(`/api/backup/${filename}/download`, {
        headers: { Authorization: `Bearer ${jwt}` },
      })

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('application/zip')
      expect(res.headers.get('Content-Disposition')).toContain(filename)

      // Verify it's a valid zip
      const buffer = Buffer.from(await res.arrayBuffer())
      const zip = new AdmZip(buffer)
      const entries = zip.getEntries().map((e) => e.entryName)
      expect(entries).toContain('metadata.json')
      expect(entries).toContain('data.json')
    })

    it('should return 404 for non-existent backup', async () => {
      await setupDb()

      const jwt = await createAdminJwt()
      const app = createApp()

      const res = await app.request('/api/backup/organizrx-backup-nonexistent.zip/download', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(404)
      expect(json.error.code).toBe('NOT_FOUND')
    })
  })

  // -------------------------------------------------------------------------
  // DELETE /api/backup/:id — delete backup
  // -------------------------------------------------------------------------

  describe('DELETE /api/backup/:id', () => {
    it('should delete a backup file', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      const jwt = await createAdminJwt()
      const app = createApp()

      // Create a backup
      const createRes = await app.request('/api/backup', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      const createJson = await createRes.json()
      const filename = createJson.data.filename

      // Delete it
      const res = await app.request(`/api/backup/${filename}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.deleted).toBe(true)
      expect(json.data.filename).toBe(filename)

      // Verify it's gone
      const listRes = await app.request('/api/backup', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const listJson = await listRes.json()
      expect(listJson.data.length).toBe(0)
    })

    it('should return 404 when deleting non-existent backup', async () => {
      await setupDb()

      const jwt = await createAdminJwt()
      const app = createApp()

      const res = await app.request('/api/backup/organizrx-backup-nonexistent.zip', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(404)
      expect(json.error.code).toBe('NOT_FOUND')
    })
  })

  // -------------------------------------------------------------------------
  // POST /api/backup/restore — restore from backup
  // -------------------------------------------------------------------------

  describe('POST /api/backup/restore', () => {
    it('should restore data from a valid backup', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      db.$client.exec(`
        INSERT INTO tabs (id, name, url, enabled, group_id, category_id, "order")
        VALUES (1, 'Original Tab', 'https://original.com', 1, 0, 1, 1)
      `)

      db.$client.exec(`
        INSERT INTO options (name, value)
        VALUES ('title', 'OriginalTitle')
      `)

      const jwt = await createAdminJwt()
      const app = createApp()

      // Create a backup
      const createRes = await app.request('/api/backup', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      const createJson = await createRes.json()
      const filename = createJson.data.filename

      // Modify the DB (simulate data changes)
      db.$client.exec(`DELETE FROM tabs`)
      db.$client.exec(`DELETE FROM options`)
      db.$client.exec(`
        INSERT INTO tabs (id, name, url, enabled, group_id, category_id, "order")
        VALUES (2, 'New Tab', 'https://new.com', 1, 0, 1, 1)
      `)

      // Download the backup
      const downloadRes = await app.request(`/api/backup/${filename}/download`, {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const backupBuffer = await downloadRes.arrayBuffer()

      // Restore from the backup
      const formData = new FormData()
      formData.append('file', new File([backupBuffer], 'backup.zip', { type: 'application/zip' }))
      formData.append('confirmRestore', 'true')

      const restoreRes = await app.request('/api/backup/restore', {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body: formData,
      })
      const restoreJson = await restoreRes.json()

      expect(restoreRes.status).toBe(200)
      expect(restoreJson.data.tables).toBeArray()
      expect(restoreJson.data.tables).toContain('tabs')
      expect(restoreJson.data.tables).toContain('options')

      // Verify restored data
      const rows = db.$client.prepare('SELECT * FROM tabs').all() as Array<{ name: string }>
      expect(rows.length).toBe(1)
      expect(rows[0].name).toBe('Original Tab')

      const optRows = db.$client
        .prepare('SELECT * FROM options WHERE name = ?')
        .all('title') as Array<{ value: string }>
      expect(optRows.length).toBe(1)
      expect(optRows[0].value).toBe('OriginalTitle')
    })

    it('should reject restore without confirmRestore', async () => {
      await setupDb()

      const jwt = await createAdminJwt()
      const app = createApp()

      const formData = new FormData()
      formData.append('file', new File([Buffer.from('fake')], 'backup.zip'))
      formData.append('confirmRestore', 'false')

      const res = await app.request('/api/backup/restore', {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body: formData,
      })
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject restore without file', async () => {
      await setupDb()

      const jwt = await createAdminJwt()
      const app = createApp()

      const formData = new FormData()
      formData.append('confirmRestore', 'true')

      const res = await app.request('/api/backup/restore', {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body: formData,
      })
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })
  })

  // -------------------------------------------------------------------------
  // Retention policy
  // -------------------------------------------------------------------------

  describe('Retention', () => {
    it('should delete oldest backups when exceeding max count', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      // Set max backups to 2
      db.$client.exec(`
        INSERT INTO options (name, value) VALUES ('BACKUP_MAX_COUNT', '2')
      `)
      _clearSettingsCache()

      const jwt = await createAdminJwt()
      const app = createApp()

      // Create 3 backups (with small delays for unique filenames)
      for (let i = 0; i < 3; i++) {
        await app.request('/api/backup', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ description: `Backup ${i + 1}` }),
        })
        // Small delay to ensure unique timestamps in filenames
        await new Promise((resolve) => setTimeout(resolve, 1100))
      }

      // List backups — should only have 2 (retention deleted oldest)
      const res = await app.request('/api/backup', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.length).toBe(2)

      // Verify the backups directory only has 2 files
      const files = await readdir(getTestBackupDir())
      const zipFiles = files.filter((f: string) => f.endsWith('.zip'))
      expect(zipFiles.length).toBe(2)
    })
  })
})
