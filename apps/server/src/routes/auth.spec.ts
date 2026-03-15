import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'
import { Hono } from 'hono'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import { _clearSettingsCache } from '../services/settings'
import {
  hashPassword,
  createAccessToken,
  createRefreshToken,
  storeRefreshToken,
  toAuthUser,
  _resetLockoutMap,
} from '../services/auth'
import authRoutes from './auth'

function uniqueDbPath(suffix = 'auth-routes'): string {
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
    INSERT INTO groups (id, "group", group_id, "default") VALUES (4, 'User', 4, 1)
  `)

  return db
}

function createApp(): Hono {
  const app = new Hono()
  app.route('/api/auth', authRoutes)
  return app
}

async function insertUser(
  db: SqliteDb,
  opts: {
    id?: number
    username?: string
    password?: string
    email?: string
    locked?: number
    totp_enabled?: number
    totp_secret?: string | null
    totp_backup_codes?: string | null
  } = {}
) {
  const id = opts.id ?? 1
  const username = opts.username ?? 'testuser'
  const password = opts.password ?? 'Password123!'
  const hash = await hashPassword(password)
  const email = opts.email ?? 'test@example.com'
  const locked = opts.locked ?? 0
  const totpEnabled = opts.totp_enabled ?? 0
  const totpSecret = opts.totp_secret ?? null
  const totpBackupCodes = opts.totp_backup_codes ?? null

  const stmt = db.$client.prepare(
    'INSERT INTO users (id, username, password, email, "group", group_id, locked, image, auth_service, totp_enabled, totp_secret, totp_backup_codes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )
  stmt.run(
    id,
    username,
    hash,
    email,
    'User',
    4,
    locked,
    null,
    'internal',
    totpEnabled,
    totpSecret,
    totpBackupCodes
  )

  return { id, username, password, email }
}

describe('auth routes', () => {
  beforeEach(async () => {
    await closeDb()
    _clearSettingsCache()
    _resetLockoutMap()
  })

  afterEach(async () => {
    await closeDb()
    _clearSettingsCache()
    _resetLockoutMap()
  })

  describe('POST /api/auth/login', () => {
    it('should login successfully and set refresh cookie', async () => {
      const db = await setupDb()
      const user = await insertUser(db)
      const app = createApp()

      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, password: user.password }),
      })
      const json = (await res.json()) as {
        data: { accessToken: string; user: { username: string } }
      }

      expect(res.status).toBe(200)
      expect(json.data.accessToken).toBeDefined()
      expect(json.data.user.username).toBe(user.username)
      expect(res.headers.get('set-cookie')).toContain('organizrx_refresh=')
    })

    it('should return validation error for empty body', async () => {
      await setupDb()
      const app = createApp()

      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = (await res.json()) as { error: { code: string } }

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return invalid credentials for wrong password', async () => {
      const db = await setupDb()
      const user = await insertUser(db)
      const app = createApp()

      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, password: 'WrongPassword!' }),
      })
      const json = (await res.json()) as { error: { code: string } }

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('INVALID_CREDENTIALS')
    })

    it('should return invalid credentials when user is not found', async () => {
      await setupDb()
      const app = createApp()

      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'missing-user', password: 'Password123!' }),
      })
      const json = (await res.json()) as { error: { code: string } }

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('INVALID_CREDENTIALS')
    })

    it('should return account disabled for locked user', async () => {
      const db = await setupDb()
      const user = await insertUser(db, { locked: 1 })
      const app = createApp()

      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, password: user.password }),
      })
      const json = (await res.json()) as { error: { code: string } }

      expect(res.status).toBe(403)
      expect(json.error.code).toBe('ACCOUNT_DISABLED')
    })

    it('should lock account after repeated failed attempts', async () => {
      const db = await setupDb()
      const user = await insertUser(db)
      const app = createApp()

      for (let i = 0; i < 5; i++) {
        const res = await app.request('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user.username, password: 'WrongPassword!' }),
        })
        expect(res.status).toBe(401)
      }

      const lockedRes = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, password: user.password }),
      })
      const json = (await lockedRes.json()) as { error: { code: string } }

      expect(lockedRes.status).toBe(429)
      expect(json.error.code).toBe('ACCOUNT_LOCKED')
    })

    it('should return requires_2fa and temp_token when 2FA is enabled', async () => {
      const db = await setupDb()
      const user = await insertUser(db, {
        totp_enabled: 1,
        totp_secret: 'encrypted-secret',
      })
      const app = createApp()

      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, password: user.password }),
      })
      const json = (await res.json()) as { data: { requires_2fa: boolean; temp_token: string } }

      expect(res.status).toBe(200)
      expect(json.data.requires_2fa).toBe(true)
      expect(json.data.temp_token).toBeDefined()
    })
  })

  describe('POST /api/auth/refresh', () => {
    it('should refresh token and rotate refresh cookie', async () => {
      await setupDb()
      const app = createApp()

      const authUser = toAuthUser({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        groupName: 'User',
        group_id: 4,
        image: null,
      })

      const oldRefreshToken = await createRefreshToken(1)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      await storeRefreshToken({
        userId: 1,
        token: oldRefreshToken,
        browser: 'test-browser',
        ip: '127.0.0.1',
        expiresAt,
      })

      const db = getRawDb() as SqliteDb
      const password = await hashPassword('Password123!')
      db.$client
        .prepare(
          'INSERT INTO users (id, username, password, email, "group", group_id, locked, image, auth_service) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .run(1, authUser.username, password, authUser.email, 'User', 4, 0, null, 'internal')

      const res = await app.request('/api/auth/refresh', {
        method: 'POST',
        headers: {
          Cookie: `organizrx_refresh=${oldRefreshToken}`,
        },
      })
      const json = (await res.json()) as { data: { accessToken: string } }

      expect(res.status).toBe(200)
      expect(json.data.accessToken).toBeDefined()
      expect(res.headers.get('set-cookie')).toContain('organizrx_refresh=')
    })

    it('should return missing token when refresh cookie is absent', async () => {
      await setupDb()
      const app = createApp()

      const res = await app.request('/api/auth/refresh', {
        method: 'POST',
      })
      const json = (await res.json()) as { error: { code: string } }

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('MISSING_TOKEN')
    })

    it('should return invalid token for malformed refresh token', async () => {
      await setupDb()
      const app = createApp()

      const res = await app.request('/api/auth/refresh', {
        method: 'POST',
        headers: {
          Cookie: 'organizrx_refresh=not-a-valid-jwt',
        },
      })
      const json = (await res.json()) as { error: { code: string } }

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('INVALID_TOKEN')
    })

    it('should return token revoked when token exists but is not stored', async () => {
      await setupDb()
      const app = createApp()
      const token = await createRefreshToken(1)

      const res = await app.request('/api/auth/refresh', {
        method: 'POST',
        headers: {
          Cookie: `organizrx_refresh=${token}`,
        },
      })
      const json = (await res.json()) as { error: { code: string } }

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('TOKEN_REVOKED')
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should logout successfully and clear refresh cookie', async () => {
      await setupDb()
      const app = createApp()

      const token = await createRefreshToken(1)
      const res = await app.request('/api/auth/logout', {
        method: 'POST',
        headers: {
          Cookie: `organizrx_refresh=${token}`,
        },
      })
      const json = (await res.json()) as { data: { success: boolean } }

      expect(res.status).toBe(200)
      expect(json.data.success).toBe(true)
      expect(res.headers.get('set-cookie')).toContain('organizrx_refresh=')
      expect(res.headers.get('set-cookie')).toContain('Max-Age=0')
    })

    it('should return success even without cookie', async () => {
      await setupDb()
      const app = createApp()

      const res = await app.request('/api/auth/logout', {
        method: 'POST',
      })
      const json = (await res.json()) as { data: { success: boolean } }

      expect(res.status).toBe(200)
      expect(json.data.success).toBe(true)
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return user with valid JWT', async () => {
      const db = await setupDb()
      await insertUser(db)
      const app = createApp()

      const authUser = toAuthUser({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        groupName: 'User',
        group_id: 4,
        image: null,
      })
      const token = await createAccessToken(authUser)

      const res = await app.request('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const json = (await res.json()) as { data: { user: { username: string } } }

      expect(res.status).toBe(200)
      expect(json.data.user.username).toBe('testuser')
    })

    it('should return unauthorized when JWT is missing', async () => {
      await setupDb()
      const app = createApp()

      const res = await app.request('/api/auth/me')
      const json = (await res.json()) as { error: { code: string } }

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should return user not found for valid JWT with deleted user', async () => {
      await setupDb()
      const app = createApp()

      const token = await createAccessToken({
        id: 999,
        username: 'ghost',
        email: null,
        groupName: 'User',
        group_id: 4,
        image: null,
      })

      const res = await app.request('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const json = (await res.json()) as { error: { code: string } }

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('USER_NOT_FOUND')
    })
  })
})
