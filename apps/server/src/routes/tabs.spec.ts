import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'
import { Hono } from 'hono'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import { _clearSettingsCache } from '../services/settings'
import { _resetTabUrlCheckCache } from '../services/tab-url-check'
import tabs from './tabs'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniqueDbPath(suffix = 'tabs-routes'): string {
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
  app.route('/api/tabs', tabs)
  return app
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('tabs routes', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(async () => {
    await closeDb()
    _clearSettingsCache()
    _resetTabUrlCheckCache()
    originalFetch = globalThis.fetch
  })

  afterEach(async () => {
    await closeDb()
    _clearSettingsCache()
    _resetTabUrlCheckCache()
    globalThis.fetch = originalFetch
  })

  // -------------------------------------------------------------------------
  // GET /api/tabs/sidebar
  // -------------------------------------------------------------------------

  describe('GET /api/tabs/sidebar', () => {
    it('should return 401 without auth', async () => {
      await setupDb()
      const app = createApp()

      const res = await app.request('/api/tabs/sidebar')
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should return tabs and categories for admin (groupID=0)', async () => {
      const db = await setupDb()

      // Insert admin user
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      // Insert tabs with different group_id values
      // Admin-only tab (group_id=0)
      db.$client.exec(`
        INSERT INTO tabs (id, name, url, enabled, group_id, category_id, "order")
        VALUES (1, 'Admin Tab', 'https://admin.test', 1, 0, 1, 1)
      `)

      // User-visible tab (group_id=4)
      db.$client.exec(`
        INSERT INTO tabs (id, name, url, enabled, group_id, category_id, "order")
        VALUES (2, 'User Tab', 'https://user.test', 1, 4, 1, 2)
      `)

      // Insert category
      db.$client.exec(`
        INSERT INTO categories (id, category, "order")
        VALUES (1, 'Media', 1)
      `)

      // Create JWT
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
      const res = await app.request('/api/tabs/sidebar', {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.tabs).toBeArray()
      expect(json.data.tabs.length).toBe(2)
      expect(json.data.categories).toBeArray()
      expect(json.data.categories.length).toBe(1)
      expect(json.data.categories[0].name).toBe('Media')
    })

    it('should return filtered tabs for non-admin user (groupID=4)', async () => {
      const db = await setupDb()

      // Insert non-admin user
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (2, 'testuser', 'user@test.com', 'User', 4, 'internal', 0)
      `)

      // Insert tabs with different group_id values
      // Admin-only tab (group_id=0) — should NOT be visible
      db.$client.exec(`
        INSERT INTO tabs (id, name, url, enabled, group_id, category_id, "order")
        VALUES (1, 'Admin Tab', 'https://admin.test', 1, 0, 1, 1)
      `)

      // User-visible tab (group_id=4) — should be visible
      db.$client.exec(`
        INSERT INTO tabs (id, name, url, enabled, group_id, category_id, "order")
        VALUES (2, 'User Tab', 'https://user.test', 1, 4, 1, 2)
      `)

      // Public tab (group_id=99) — should be visible
      db.$client.exec(`
        INSERT INTO tabs (id, name, url, enabled, group_id, category_id, "order")
        VALUES (3, 'Public Tab', 'https://public.test', 1, 99, 1, 3)
      `)

      // Insert category
      db.$client.exec(`
        INSERT INTO categories (id, category, "order")
        VALUES (1, 'Media', 1)
      `)

      // Create JWT for non-admin
      const { createAccessToken, toAuthUser } = await import('../services/auth')
      const authUser = toAuthUser({
        id: 2,
        username: 'testuser',
        email: 'user@test.com',
        groupName: 'User',
        group_id: 4,
        image: null,
      })
      const jwt = await createAccessToken(authUser)

      const app = createApp()
      const res = await app.request('/api/tabs/sidebar', {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.tabs).toBeArray()
      // Only tabs with group_id >= 4 should be visible (2 and 3)
      expect(json.data.tabs.length).toBe(2)
      expect(json.data.tabs.some((t: any) => t.name === 'Admin Tab')).toBe(false)
      expect(json.data.tabs.some((t: any) => t.name === 'User Tab')).toBe(true)
      expect(json.data.tabs.some((t: any) => t.name === 'Public Tab')).toBe(true)
      expect(json.data.categories).toBeArray()
      expect(json.data.categories.length).toBe(1)
    })

    it('should return empty arrays when no tabs exist', async () => {
      const db = await setupDb()

      // Insert user with no tabs in database
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      // Create JWT
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
      const res = await app.request('/api/tabs/sidebar', {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.tabs).toBeArray()
      expect(json.data.tabs.length).toBe(0)
      expect(json.data.categories).toBeArray()
      expect(json.data.categories.length).toBe(0)
    })
  })

  describe('GET /api/tabs/check-url', () => {
    async function createAuthedApp() {
      const db = await setupDb()

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

      return {
        app: createApp(),
        jwt: await createAccessToken(authUser),
      }
    }

    it('returns reachable and iframeAllowed for reachable URL', async () => {
      const fetchMock = mock(() =>
        Promise.resolve(
          new Response(null, {
            status: 204,
            headers: {},
          })
        )
      )
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const { app, jwt } = await createAuthedApp()
      const res = await app.request('/api/tabs/check-url?url=https%3A%2F%2Fexample.com', {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.reachable).toBe(true)
      expect(json.data.iframeAllowed).toBe(true)
      expect(json.data.status).toBe(204)
    })

    it('blocks iframe when X-Frame-Options is DENY', async () => {
      const fetchMock = mock(() =>
        Promise.resolve(
          new Response(null, {
            status: 200,
            headers: {
              'X-Frame-Options': 'DENY',
            },
          })
        )
      )
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const { app, jwt } = await createAuthedApp()
      const res = await app.request('/api/tabs/check-url?url=https%3A%2F%2Fexample.com', {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.reachable).toBe(true)
      expect(json.data.iframeAllowed).toBe(false)
      expect(json.data.status).toBe(200)
    })

    it('blocks cloud metadata URLs via SSRF protection', async () => {
      const { app, jwt } = await createAuthedApp()
      const res = await app.request(
        '/api/tabs/check-url?url=http%3A%2F%2F169.254.169.254%2Flatest',
        {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        }
      )

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error.code).toBe('SSRF_BLOCKED')
    })

    it('allows private IP URLs for home-lab use', async () => {
      const fetchMock = mock(() =>
        Promise.resolve(
          new Response(null, {
            status: 200,
            headers: {},
          })
        )
      )
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const { app, jwt } = await createAuthedApp()
      const res = await app.request('/api/tabs/check-url?url=http%3A%2F%2F192.168.1.10%3A8989', {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.reachable).toBe(true)
      expect(json.data.iframeAllowed).toBe(true)
      expect(json.data.status).toBe(200)
    })
  })

  describe('PUT /api/tabs/:id', () => {
    async function createAuthedApp() {
      const db = await setupDb()

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

      return {
        db,
        app: createApp(),
        jwt: await createAccessToken(authUser),
      }
    }

    it('allows updating allowed fields for a default tab', async () => {
      const { app, jwt, db } = await createAuthedApp()

      // Insert default tab
      db.$client.exec(`
        INSERT INTO tabs (id, name, url, enabled, group_id, category_id, "order", "default", type)
        VALUES (99, 'Dashboard', '/', 1, 0, 1, 1, 1, 0)
      `)

      const payload = {
        name: 'Updated Dashboard',
        enabled: 0,
        group_id: 1,
      }

      const res = await app.request('/api/tabs/99', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.name).toBe('Updated Dashboard')
      expect(json.data.enabled).toBe(0)
      expect(json.data.group_id).toBe(1)
    })

    it('rejects updating type or url for a default tab', async () => {
      const { app, jwt, db } = await createAuthedApp()

      // Insert default tab
      db.$client.exec(`
        INSERT INTO tabs (id, name, url, enabled, group_id, category_id, "order", "default", type)
        VALUES (99, 'Dashboard', '/', 1, 0, 1, 1, 1, 0)
      `)

      // Test URL change rejection
      let res = await app.request('/api/tabs/99', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: '/new-url' }),
      })

      expect(res.status).toBe(400)
      let json = await res.json()
      expect(json.error.message).toBe('Cannot change URL for built-in tabs')

      // Test Type change rejection
      res = await app.request('/api/tabs/99', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 1 }),
      })

      expect(res.status).toBe(400)
      json = await res.json()
      expect(json.error.message).toBe('Cannot change type for built-in tabs')
    })
  })
})
