import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'
import { Hono } from 'hono'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import { _clearSettingsCache } from '../services/settings'
import { parseSemVer, isNewerVersion, _resetUpdateCache } from '../services/updater'
import update from './update'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniqueDbPath(suffix = 'update-routes'): string {
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
  app.route('/api/update', update)
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

function mockGitHubRelease(tagName = 'v1.0.0', body = 'Release notes') {
  return mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          tag_name: tagName,
          html_url: `https://github.com/dawidkulpa/organizrx/releases/tag/${tagName}`,
          body,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    )
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('update routes', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(async () => {
    await closeDb()
    _clearSettingsCache()
    _resetUpdateCache()
    originalFetch = globalThis.fetch
  })

  afterEach(async () => {
    await closeDb()
    _clearSettingsCache()
    _resetUpdateCache()
    globalThis.fetch = originalFetch
  })

  // -------------------------------------------------------------------------
  // Semver comparison (pure function tests)
  // -------------------------------------------------------------------------

  describe('parseSemVer', () => {
    it('should parse valid semver', () => {
      expect(parseSemVer('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 })
    })

    it('should strip v prefix', () => {
      expect(parseSemVer('v1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 })
    })

    it('should return null for invalid input', () => {
      expect(parseSemVer('invalid')).toBeNull()
      expect(parseSemVer('1.2')).toBeNull()
      expect(parseSemVer('a.b.c')).toBeNull()
    })
  })

  describe('isNewerVersion', () => {
    it('should detect patch updates', () => {
      expect(isNewerVersion('1.0.0', '1.0.1')).toBe(true)
    })

    it('should detect minor updates', () => {
      expect(isNewerVersion('1.0.0', '1.1.0')).toBe(true)
    })

    it('should detect major updates', () => {
      expect(isNewerVersion('1.0.0', '2.0.0')).toBe(true)
    })

    it('should return false for equal versions', () => {
      expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false)
    })

    it('should return false when current is newer', () => {
      expect(isNewerVersion('2.0.0', '1.0.0')).toBe(false)
    })

    it('should handle v prefix', () => {
      expect(isNewerVersion('v1.0.0', 'v1.0.1')).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // Authentication & Authorization
  // -------------------------------------------------------------------------

  describe('Authentication', () => {
    it('should return 401 without auth', async () => {
      await setupDb()
      const app = createApp()

      const res = await app.request('/api/update')
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 403 for non-admin', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (2, 'testuser', 'user@test.com', 'User', 4, 'internal', 0)
      `)

      const jwt = await createUserJwt()
      const app = createApp()

      const res = await app.request('/api/update', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })

  // -------------------------------------------------------------------------
  // GET /api/update — check for updates
  // -------------------------------------------------------------------------

  describe('GET /api/update', () => {
    it('should return update check result when update is available', async () => {
      const db = await setupDb()
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      const fetchMock = mockGitHubRelease('v1.0.0', 'New release notes')
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const jwt = await createAdminJwt()
      const app = createApp()

      const res = await app.request('/api/update', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.currentVersion).toBe('0.0.1')
      expect(json.data.latestVersion).toBe('1.0.0')
      expect(json.data.updateAvailable).toBe(true)
      expect(json.data.releaseUrl).toContain('github.com')
      expect(json.data.releaseNotes).toBe('New release notes')
      expect(json.data.checkedAt).toBeDefined()
    })

    it('should return no update when versions match', async () => {
      const db = await setupDb()
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      const fetchMock = mockGitHubRelease('v0.0.1')
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const jwt = await createAdminJwt()
      const app = createApp()

      const res = await app.request('/api/update', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.updateAvailable).toBe(false)
    })

    it('should return cached result on second call', async () => {
      const db = await setupDb()
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      let callCount = 0
      const fetchMock = mock(() => {
        callCount++
        return Promise.resolve(
          new Response(
            JSON.stringify({
              tag_name: 'v1.0.0',
              html_url: 'https://github.com/dawidkulpa/organizrx/releases/tag/v1.0.0',
              body: 'Notes',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        )
      })
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const jwt = await createAdminJwt()
      const app = createApp()

      // First call — hits GitHub
      await app.request('/api/update', {
        headers: { Authorization: `Bearer ${jwt}` },
      })

      // Second call — should use cache
      const res = await app.request('/api/update', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.latestVersion).toBe('1.0.0')
      expect(callCount).toBe(1)
    })
  })

  // -------------------------------------------------------------------------
  // Network error handling
  // -------------------------------------------------------------------------

  describe('Error handling', () => {
    it('should return 500 on network error', async () => {
      const db = await setupDb()
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      const fetchMock = mock(() => Promise.reject(new Error('Network error')))
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const jwt = await createAdminJwt()
      const app = createApp()

      const res = await app.request('/api/update', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.error.code).toBe('UPDATE_CHECK_FAILED')
      expect(json.error.message).toContain('Network error')
    })

    it('should return error on GitHub rate limit (403)', async () => {
      const db = await setupDb()
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      const fetchMock = mock(() =>
        Promise.resolve(new Response('rate limit exceeded', { status: 403 }))
      )
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const jwt = await createAdminJwt()
      const app = createApp()

      const res = await app.request('/api/update', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.error.code).toBe('UPDATE_CHECK_FAILED')
      expect(json.error.message).toContain('rate limit')
    })

    it('should return error on GitHub rate limit (429)', async () => {
      const db = await setupDb()
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      const fetchMock = mock(() =>
        Promise.resolve(new Response('too many requests', { status: 429 }))
      )
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const jwt = await createAdminJwt()
      const app = createApp()

      const res = await app.request('/api/update', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.error.code).toBe('UPDATE_CHECK_FAILED')
      expect(json.error.message).toContain('rate limit')
    })

    it('should return no update when GitHub returns 404 (no releases)', async () => {
      const db = await setupDb()
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      const fetchMock = mock(() =>
        Promise.resolve(new Response('Not Found', { status: 404 }))
      )
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const jwt = await createAdminJwt()
      const app = createApp()

      const res = await app.request('/api/update', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.updateAvailable).toBe(false)
      expect(json.data.currentVersion).toBe('0.0.1')
      expect(json.data.latestVersion).toBe('0.0.1')
    })
  })

  // -------------------------------------------------------------------------
  // GET /api/update/changelog
  // -------------------------------------------------------------------------

  describe('GET /api/update/changelog', () => {
    it('should return changelog', async () => {
      const db = await setupDb()
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      const fetchMock = mockGitHubRelease('v1.2.0', '## Changes\n- Feature A\n- Bug fix B')
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const jwt = await createAdminJwt()
      const app = createApp()

      const res = await app.request('/api/update/changelog', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.version).toBe('1.2.0')
      expect(json.data.releaseNotes).toContain('Feature A')
    })

    it('should return 401 without auth for changelog', async () => {
      await setupDb()
      const app = createApp()

      const res = await app.request('/api/update/changelog')
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 500 on changelog network error', async () => {
      const db = await setupDb()
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      const fetchMock = mock(() => Promise.reject(new Error('Connection refused')))
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const jwt = await createAdminJwt()
      const app = createApp()

      const res = await app.request('/api/update/changelog', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.error.code).toBe('CHANGELOG_FETCH_FAILED')
    })

    it('should return empty changelog when GitHub returns 404 (no releases)', async () => {
      const db = await setupDb()
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      const fetchMock = mock(() =>
        Promise.resolve(new Response('Not Found', { status: 404 }))
      )
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const jwt = await createAdminJwt()
      const app = createApp()

      const res = await app.request('/api/update/changelog', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.releaseNotes).toBe('')
      expect(json.data.version).toBe('0.0.1')
    })
  })
})
