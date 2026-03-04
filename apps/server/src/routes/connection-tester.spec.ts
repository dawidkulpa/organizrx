import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'
import { Hono } from 'hono'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import { _clearSettingsCache } from '../services/settings'
import connectionTester from './connection-tester'
import { _resetRateLimit } from '../services/connection-tester'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniqueDbPath(suffix = 'connection-tester-routes'): string {
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
  app.route('/api/test-connection', connectionTester)
  return app
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('connection-tester routes', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(async () => {
    await closeDb()
    _clearSettingsCache()
    _resetRateLimit()
    originalFetch = globalThis.fetch
  })

  afterEach(async () => {
    await closeDb()
    _clearSettingsCache()
    globalThis.fetch = originalFetch
  })

  // -------------------------------------------------------------------------
  // Authentication Tests
  // -------------------------------------------------------------------------

  describe('Authentication & Authorization', () => {
    it('should return 401 without auth', async () => {
      await setupDb()
      const app = createApp()

      const res = await app.request('/api/test-connection', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
        headers: { 'Content-Type': 'application/json' },
      })

      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 403 for non-admin user (groupID > 1)', async () => {
      const db = await setupDb()

      // Insert non-admin user
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (2, 'regularuser', 'user@test.com', 'User', 4, 'internal', 0)
      `)

      // Create JWT for non-admin
      const { createAccessToken, toAuthUser } = await import('../services/auth')
      const authUser = toAuthUser({
        id: 2,
        username: 'regularuser',
        email: 'user@test.com',
        groupName: 'User',
        group_id: 4,
        image: null,
      })
      const jwt = await createAccessToken(authUser)

      const app = createApp()
      const res = await app.request('/api/test-connection', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      })

      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should accept admin user (groupID = 0)', async () => {
      const db = await setupDb()

      // Insert admin user
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      // Mock successful fetch
      const fetchMock = mock(() =>
        Promise.resolve(
          new Response('OK', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          })
        )
      )
      globalThis.fetch = fetchMock as unknown as typeof fetch

      // Create JWT for admin
      const { createAccessToken, toAuthUser } = await import('../services/auth')
      const authUser = toAuthUser({
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        groupName: 'Admin',
        group_id: 0,
        image: null,
      })
      const jwt = await createAccessToken(authUser)

      const app = createApp()
      const res = await app.request('/api/test-connection', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.success).toBe(true)
      expect(json.data.latencyMs).toBeGreaterThanOrEqual(0)
      expect(json.data.statusCode).toBe(200)
    })

    it('should accept co-admin user (groupID = 1)', async () => {
      const db = await setupDb()

      // Insert co-admin user
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'coadmin', 'coadmin@test.com', 'Co-Admin', 1, 'internal', 0)
      `)

      // Mock successful fetch
      const fetchMock = mock(() =>
        Promise.resolve(
          new Response('OK', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          })
        )
      )
      globalThis.fetch = fetchMock as unknown as typeof fetch

      // Create JWT for co-admin
      const { createAccessToken, toAuthUser } = await import('../services/auth')
      const authUser = toAuthUser({
        id: 1,
        username: 'coadmin',
        email: 'coadmin@test.com',
        groupName: 'Co-Admin',
        group_id: 1,
        image: null,
      })
      const jwt = await createAccessToken(authUser)

      const app = createApp()
      const res = await app.request('/api/test-connection', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.success).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // Valid Connection Tests
  // -------------------------------------------------------------------------

  describe('Valid HTTP/HTTPS Connections', () => {
    beforeEach(async () => {
      await setupDb()
    })

    async function getAdminJwt() {
      const db = getRawDb() as SqliteDb
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

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

    it('should test successful HTTP connection', async () => {
      const fetchMock = mock(() =>
        Promise.resolve(
          new Response('OK', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          })
        )
      )
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const jwt = await getAdminJwt()
      const app = createApp()
      const res = await app.request('/api/test-connection', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.success).toBe(true)
      expect(json.data.latencyMs).toBeGreaterThanOrEqual(0)
      expect(json.data.statusCode).toBe(200)
    })

    it('should return error for failed connection', async () => {
      const fetchMock = mock(() =>
        Promise.resolve(
          new Response('Not Found', {
            status: 404,
            headers: { 'Content-Type': 'text/plain' },
          })
        )
      )
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const jwt = await getAdminJwt()
      const app = createApp()
      const res = await app.request('/api/test-connection', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.success).toBe(false)
      expect(json.data.statusCode).toBe(404)
    })

    it('should send Basic auth header when username and password provided', async () => {
      let capturedHeaders: Record<string, string> | null = null
      const fetchMock = mock((url: string, init?: RequestInit) => {
        // Verify URL is passed
        void url
        const headerObj = init?.headers
        if (headerObj instanceof Headers) {
          capturedHeaders = {}
          headerObj.forEach((value, key) => {
            if (capturedHeaders) capturedHeaders[key] = value
          })
        }
        return Promise.resolve(
          new Response('OK', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          })
        )
      })
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const jwt = await getAdminJwt()
      const app = createApp()
      const res = await app.request('/api/test-connection', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.com',
          username: 'testuser',
          password: 'testpass',
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      })

      expect(res.status).toBe(200)
      const authHeader = capturedHeaders?.['authorization'] ?? ''
      expect(authHeader).toContain('Basic')
      const base64 = authHeader.split(' ')[1]
      const decoded = Buffer.from(base64 || '', 'base64').toString('utf-8')
      expect(decoded).toBe('testuser:testpass')
    })

    it('should send X-Api-Key header when apiKey provided with username', async () => {
      let capturedAuthzHeader: string | null = null
      const fetchMock = mock((url: string, init?: RequestInit) => {
        void url
        const headerObj = init?.headers
        if (headerObj instanceof Headers) {
          capturedAuthzHeader = headerObj.get('X-Api-Key')
        }
        return Promise.resolve(
          new Response('OK', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          })
        )
      })
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const jwt = await getAdminJwt()
      const app = createApp()
      const res = await app.request('/api/test-connection', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.com',
          apiKey: 'secret-key-123',
          username: 'testuser',
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      })

      expect(res.status).toBe(200)
      expect(capturedAuthzHeader).not.toBeNull()
      expect(capturedAuthzHeader!).toBe('secret-key-123')
    })
    it('should send Bearer token when apiKey provided without username', async () => {
      let capturedAuthzHeader: string | null = null
      const fetchMock = mock((url: string, init?: RequestInit) => {
        // Verify URL is passed
        void url
        const headerObj = init?.headers
        if (headerObj instanceof Headers) {
          capturedAuthzHeader = headerObj.get('Authorization')
        }
        return Promise.resolve(
          new Response('OK', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          })
        )
      })
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const jwt = await getAdminJwt()
      const app = createApp()
      const res = await app.request('/api/test-connection', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.com',
          apiKey: 'bearer-token-123',
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      })

      expect(res.status).toBe(200)
      expect(capturedAuthzHeader).not.toBeNull()
      expect(capturedAuthzHeader!).toBe('Bearer bearer-token-123')
    })
  })

  // -------------------------------------------------------------------------
  // Private IP Tests (Home-Lab Allowed)
  // -------------------------------------------------------------------------

  describe('Private IPs (Home-Lab Allowed)', () => {
    beforeEach(async () => {
      await setupDb()
    })

    async function getAdminJwt() {
      const db = getRawDb() as SqliteDb
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

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

    it('should allow 192.168.x.x addresses', async () => {
      const fetchMock = mock(() =>
        Promise.resolve(
          new Response('OK', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          })
        )
      )
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const jwt = await getAdminJwt()
      const app = createApp()
      const res = await app.request('/api/test-connection', {
        method: 'POST',
        body: JSON.stringify({ url: 'http://192.168.1.50:8989' }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.success).toBe(true)
    })

    it('should allow 10.x.x.x addresses', async () => {
      const fetchMock = mock(() =>
        Promise.resolve(
          new Response('OK', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          })
        )
      )
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const jwt = await getAdminJwt()
      const app = createApp()
      const res = await app.request('/api/test-connection', {
        method: 'POST',
        body: JSON.stringify({ url: 'http://10.0.0.1:3000' }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.success).toBe(true)
    })

    it('should allow 172.16.0.0-172.31.255.255 addresses', async () => {
      const fetchMock = mock(() =>
        Promise.resolve(
          new Response('OK', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          })
        )
      )
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const jwt = await getAdminJwt()
      const app = createApp()
      const res = await app.request('/api/test-connection', {
        method: 'POST',
        body: JSON.stringify({ url: 'http://172.20.0.1:5000' }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.success).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // SSRF Protection Tests
  // -------------------------------------------------------------------------

  describe('SSRF Protection', () => {
    beforeEach(async () => {
      await setupDb()
    })

    async function getAdminJwt() {
      const db = getRawDb() as SqliteDb
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

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

    it('should block AWS metadata IP (169.254.169.254)', async () => {
      const jwt = await getAdminJwt()
      const app = createApp()
      const res = await app.request('/api/test-connection', {
        method: 'POST',
        body: JSON.stringify({ url: 'http://169.254.169.254/' }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      })

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error.code).toBe('SSRF_BLOCKED')
    })

    it('should block localhost (127.0.0.1)', async () => {
      const jwt = await getAdminJwt()
      const app = createApp()
      const res = await app.request('/api/test-connection', {
        method: 'POST',
        body: JSON.stringify({ url: 'http://127.0.0.1/' }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      })

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error.code).toBe('SSRF_BLOCKED')
    })

    it('should block IPv6 loopback (::1)', async () => {
      const jwt = await getAdminJwt()
      const app = createApp()
      const res = await app.request('/api/test-connection', {
        method: 'POST',
        body: JSON.stringify({ url: 'http://[::1]/' }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      })

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error.code).toBe('SSRF_BLOCKED')
    })

    it('should reject file:// protocol', async () => {
      const jwt = await getAdminJwt()
      const app = createApp()
      const res = await app.request('/api/test-connection', {
        method: 'POST',
        body: JSON.stringify({ url: 'file:///etc/passwd' }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      })

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error.code).toBe('SSRF_BLOCKED')
    })

    it('should reject ftp:// protocol', async () => {
      const jwt = await getAdminJwt()
      const app = createApp()
      const res = await app.request('/api/test-connection', {
        method: 'POST',
        body: JSON.stringify({ url: 'ftp://evil.com' }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      })

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error.code).toBe('SSRF_BLOCKED')
    })
  })

  // -------------------------------------------------------------------------
  // Validation Tests
  // -------------------------------------------------------------------------

  describe('Request Validation', () => {
    beforeEach(async () => {
      await setupDb()
    })

    async function getAdminJwt() {
      const db = getRawDb() as SqliteDb
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

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

    it('should reject invalid URL format', async () => {
      const jwt = await getAdminJwt()
      const app = createApp()
      const res = await app.request('/api/test-connection', {
        method: 'POST',
        body: JSON.stringify({ url: 'not a url' }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      })

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should accept timeout between 1000 and 30000', async () => {
      const fetchMock = mock(() =>
        Promise.resolve(
          new Response('OK', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          })
        )
      )
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const jwt = await getAdminJwt()
      const app = createApp()
      const res = await app.request('/api/test-connection', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.com',
          timeout: 5000,
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.success).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // Rate Limiting Tests
  // -------------------------------------------------------------------------

  describe('Rate Limiting', () => {
    beforeEach(async () => {
      await setupDb()
    })

    async function getAdminJwt() {
      const db = getRawDb() as SqliteDb
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

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

    it('should allow up to 5 requests per minute', async () => {
      const fetchMock = mock(() =>
        Promise.resolve(
          new Response('OK', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          })
        )
      )
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const jwt = await getAdminJwt()
      const app = createApp()

      // Make 5 successful requests
      for (let i = 0; i < 5; i++) {
        const res = await app.request('/api/test-connection', {
          method: 'POST',
          body: JSON.stringify({ url: 'https://example.com' }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
          },
        })
        expect(res.status).toBe(200)
      }

      // 6th request should be rate limited
      const res = await app.request('/api/test-connection', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      })

      expect(res.status).toBe(429)
      const json = await res.json()
      expect(json.error.code).toBe('RATE_LIMITED')
    })
  })
})
