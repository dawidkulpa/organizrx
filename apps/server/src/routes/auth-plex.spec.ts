import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'
import { Hono } from 'hono'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import { _clearSettingsCache, setSetting } from '../services/settings'
import type { PlexPinResponse, PlexUserInfo } from '../services/auth-plex'
import plexAuthRoutes from './auth-plex'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniqueDbPath(suffix = 'plex-routes'): string {
  const dir = join(tmpdir(), 'organizrx-test-' + process.pid)
  mkdirSync(dir, { recursive: true })
  return join(dir, `test-${suffix}-${Date.now()}.db`)
}

const mockPlexUser: PlexUserInfo = {
  id: 12345,
  uuid: 'test-uuid-123',
  email: 'plex@test.com',
  username: 'plexuser',
  title: 'Plex User',
  thumb: 'https://plex.tv/users/avatar.png',
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

  // Insert default user group
  db.$client.exec(`
    INSERT INTO groups (id, "group", group_id, "default") VALUES (4, 'User', 4, 1)
  `)

  return db
}

function createApp(): Hono {
  const app = new Hono()
  app.route('/api/auth', plexAuthRoutes)
  return app
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('auth-plex routes', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(async () => {
    originalFetch = globalThis.fetch
    await closeDb()
    _clearSettingsCache()
  })

  afterEach(async () => {
    globalThis.fetch = originalFetch
    await closeDb()
    _clearSettingsCache()
  })

  // -------------------------------------------------------------------------
  // GET /api/auth/plex — Initiate Plex OAuth
  // -------------------------------------------------------------------------

  describe('GET /api/auth/plex', () => {
    it('should return 403 when Plex auth is disabled', async () => {
      await setupDb()
      const app = createApp()

      const res = await app.request('/api/auth/plex')
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.error.code).toBe('PLEX_DISABLED')
    })

    it('should return pin_id and auth_url when Plex is enabled', async () => {
      await setupDb()
      await setSetting('plex_enabled', 'true')

      const mockPinResponse: PlexPinResponse = {
        id: 999,
        code: 'XYZW',
        authToken: null,
      }

      const fetchMock = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPinResponse),
        })
      )
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const app = createApp()
      const res = await app.request('/api/auth/plex')
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.pin_id).toBe(999)
      expect(json.data.code).toBe('XYZW')
      expect(json.data.auth_url).toContain('https://app.plex.tv/auth')
      expect(json.data.auth_url).toContain('code=XYZW')
    })

    it('should return 500 when Plex API fails', async () => {
      await setupDb()
      await setSetting('plex_enabled', 'true')

      const fetchMock = mock(() =>
        Promise.resolve({
          ok: false,
          statusText: 'Service Unavailable',
        })
      )
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const app = createApp()
      const res = await app.request('/api/auth/plex')
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.error.code).toBe('PLEX_ERROR')
    })
  })

  // -------------------------------------------------------------------------
  // GET /api/auth/plex/callback — Poll for completed auth
  // -------------------------------------------------------------------------

  describe('GET /api/auth/plex/callback', () => {
    it('should return 403 when Plex auth is disabled', async () => {
      await setupDb()
      const app = createApp()

      const res = await app.request('/api/auth/plex/callback?pin_id=123')
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.error.code).toBe('PLEX_DISABLED')
    })

    it('should return 400 when pin_id is missing', async () => {
      await setupDb()
      await setSetting('plex_enabled', 'true')

      const app = createApp()
      const res = await app.request('/api/auth/plex/callback')
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 202 when user has not completed auth yet', async () => {
      await setupDb()
      await setSetting('plex_enabled', 'true')

      const mockPinResponse: PlexPinResponse = {
        id: 123,
        code: 'ABCD',
        authToken: null,
      }

      const fetchMock = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPinResponse),
        })
      )
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const app = createApp()
      const res = await app.request('/api/auth/plex/callback?pin_id=123')
      const json = await res.json()

      expect(res.status).toBe(202)
      expect(json.error.code).toBe('AUTH_PENDING')
    })

    it('should return JWT tokens when auth is complete', async () => {
      await setupDb()
      await setSetting('plex_enabled', 'true')

      let callCount = 0
      const fetchMock = mock((url: string) => {
        callCount++
        // First call: pollPlexAuth — return auth token
        if (url.includes('/api/v2/pins/')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: 123,
                code: 'ABCD',
                authToken: 'plex-auth-token-abc',
              } satisfies PlexPinResponse),
          })
        }
        // Second call: verifyPlexToken — return user info
        if (url.includes('/api/v2/user')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPlexUser),
          })
        }
        return Promise.resolve({ ok: false, statusText: 'Unknown' })
      })
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const app = createApp()
      const res = await app.request('/api/auth/plex/callback?pin_id=123')
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.accessToken).toBeDefined()
      expect(json.data.refreshToken).toBeDefined()
      expect(json.data.user.username).toBe('plexuser')
      expect(json.data.user.email).toBe('plex@test.com')
    })

    it('should return 403 when user lacks server access and admin_only is enabled', async () => {
      await setupDb()
      await setSetting('plex_enabled', 'true')
      await setSetting('plex_admin_only', 'true')
      await setSetting('plex_server_id', 'my-server-id')

      const fetchMock = mock((url: string) => {
        if (url.includes('/api/v2/pins/')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: 123,
                code: 'ABCD',
                authToken: 'plex-auth-token-abc',
              } satisfies PlexPinResponse),
          })
        }
        if (url.includes('/api/v2/user')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPlexUser),
          })
        }
        if (url.includes('/api/v2/resources')) {
          // No matching server
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                { machineIdentifier: 'other-server', name: 'Other' },
              ]),
          })
        }
        return Promise.resolve({ ok: false, statusText: 'Unknown' })
      })
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const app = createApp()
      const res = await app.request('/api/auth/plex/callback?pin_id=123')
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.error.code).toBe('ACCESS_DENIED')
    })

    it('should grant access when user has server access and admin_only is enabled', async () => {
      await setupDb()
      await setSetting('plex_enabled', 'true')
      await setSetting('plex_admin_only', 'true')
      await setSetting('plex_server_id', 'my-server-id')

      const fetchMock = mock((url: string) => {
        if (url.includes('/api/v2/pins/')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: 123,
                code: 'ABCD',
                authToken: 'plex-auth-token-abc',
              } satisfies PlexPinResponse),
          })
        }
        if (url.includes('/api/v2/user')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPlexUser),
          })
        }
        if (url.includes('/api/v2/resources')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                { machineIdentifier: 'my-server-id', name: 'My Server' },
              ]),
          })
        }
        return Promise.resolve({ ok: false, statusText: 'Unknown' })
      })
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const app = createApp()
      const res = await app.request('/api/auth/plex/callback?pin_id=123')
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.accessToken).toBeDefined()
      expect(json.data.user.username).toBe('plexuser')
    })
  })

  // -------------------------------------------------------------------------
  // POST /api/auth/plex/link — Link existing user to Plex
  // -------------------------------------------------------------------------

  describe('POST /api/auth/plex/link', () => {
    it('should return 401 when no auth token provided', async () => {
      await setupDb()
      await setSetting('plex_enabled', 'true')

      const app = createApp()
      const res = await app.request('/api/auth/plex/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_token: 'some-plex-token' }),
      })
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 403 when Plex auth is disabled', async () => {
      await setupDb()

      // Create user and get a valid JWT
      const { createAccessToken, toAuthUser } = await import('../services/auth')
      const authUser = toAuthUser({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        groupName: 'User',
        group_id: 4,
        image: null,
      })
      const jwt = await createAccessToken(authUser)

      const app = createApp()
      const res = await app.request('/api/auth/plex/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ auth_token: 'some-plex-token' }),
      })
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.error.code).toBe('PLEX_DISABLED')
    })

    it('should return 400 when auth_token is missing', async () => {
      await setupDb()
      await setSetting('plex_enabled', 'true')

      const { createAccessToken, toAuthUser } = await import('../services/auth')
      const authUser = toAuthUser({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        groupName: 'User',
        group_id: 4,
        image: null,
      })
      const jwt = await createAccessToken(authUser)

      const app = createApp()
      const res = await app.request('/api/auth/plex/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({}),
      })
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should successfully link Plex account to existing user', async () => {
      const db = await setupDb()
      await setSetting('plex_enabled', 'true')

      // Insert user
      db.$client.exec(`
        INSERT INTO users (id, username, password, email, "group", group_id, auth_service, locked)
        VALUES (1, 'testuser', 'hash', 'test@example.com', 'User', 4, 'internal', 0)
      `)

      const { createAccessToken, toAuthUser } = await import('../services/auth')
      const authUser = toAuthUser({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        groupName: 'User',
        group_id: 4,
        image: null,
      })
      const jwt = await createAccessToken(authUser)

      // Mock verifyPlexToken inside linkPlexAccount
      const fetchMock = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPlexUser),
        })
      )
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const app = createApp()
      const res = await app.request('/api/auth/plex/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ auth_token: 'valid-plex-token' }),
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.success).toBe(true)
      expect(json.data.message).toBe('Plex account linked successfully')

      // Verify DB was updated
      const rows = db.$client.query('SELECT plex_token, auth_service FROM users WHERE id = 1').all() as Array<{ plex_token: string | null; auth_service: string | null }>
      expect(rows[0].plex_token).toBe('valid-plex-token')
      expect(rows[0].auth_service).toBe('plex')
    })

    it('should return 403 when admin_only is enabled and user lacks server access', async () => {
      const db = await setupDb()
      await setSetting('plex_enabled', 'true')
      await setSetting('plex_admin_only', 'true')
      await setSetting('plex_server_id', 'my-server-id')

      db.$client.exec(`
        INSERT INTO users (id, username, password, email, "group", group_id, auth_service, locked)
        VALUES (1, 'testuser', 'hash', 'test@example.com', 'User', 4, 'internal', 0)
      `)

      const { createAccessToken, toAuthUser } = await import('../services/auth')
      const authUser = toAuthUser({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        groupName: 'User',
        group_id: 4,
        image: null,
      })
      const jwt = await createAccessToken(authUser)

      const fetchMock = mock((url: string) => {
        if (url.includes('/api/v2/user')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPlexUser),
          })
        }
        if (url.includes('/api/v2/resources')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                { machineIdentifier: 'other-server', name: 'Other' },
              ]),
          })
        }
        return Promise.resolve({ ok: false, statusText: 'Unknown' })
      })
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const app = createApp()
      const res = await app.request('/api/auth/plex/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ auth_token: 'valid-plex-token' }),
      })
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.error.code).toBe('ACCESS_DENIED')
    })
  })
})
