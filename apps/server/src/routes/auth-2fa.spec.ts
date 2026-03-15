import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'
import { Hono } from 'hono'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import { _clearSettingsCache } from '../services/settings'
import { createAccessToken } from '../services/auth/jwt'
import { hashPassword } from '../services/auth/password'
import { toAuthUser, _resetLockoutMap } from '../services/auth/lockout'
import { createTempToken } from '../services/auth-2fa/db'
import { encryptSecret } from '../services/auth-2fa/crypto'

const forceFindUserByIdNull = { value: false }

function inlineFindUserById(userId: number) {
  if (forceFindUserByIdNull.value) return null
  const db = getRawDb() as SqliteDb
  const rows = db.$client
    .prepare(
      `SELECT id, username, email, "group" as groupName, group_id, image FROM users WHERE id = ?`
    )
    .all(userId) as {
    id: number
    username: string
    email: string | null
    groupName: string | null
    group_id: number | null
    image: string | null
  }[]
  if (rows.length === 0) return null
  return toAuthUser(rows[0])
}

function inlineFindUserByUsername(username: string) {
  const db = getRawDb() as SqliteDb
  const rows = db.$client
    .prepare(
      `SELECT id, username, password, email, "group" as groupName, group_id, image, locked FROM users WHERE username = ?`
    )
    .all(username) as {
    id: number
    username: string
    password: string
    email: string | null
    groupName: string | null
    group_id: number | null
    image: string | null
    locked: number | null
  }[]
  if (rows.length === 0) return null
  return rows[0]
}

mock.module('../services/auth/users', () => ({
  findUserByUsername: inlineFindUserByUsername,
  findUserById: inlineFindUserById,
}))

mock.module('../services/auth-2fa/totp', () => ({
  generateTotpSecret: (username: string) => ({
    secret: `SECRET_${username}`,
    qrUri: `otpauth://totp/OrganizrX:${username}`,
  }),
  verifyTotpCode: (_secret: string, token: string) => token === '123456',
}))

mock.module('../services/auth-2fa/backup-codes', () => ({
  generateBackupCodes: async () => ({
    plain: ['BACKUP1', 'BACKUP2', 'BACKUP3', 'BACKUP4', 'BACKUP5', 'BACKUP6', 'BACKUP7', 'BACKUP8'],
    hashed: ['HASHED-BACKUP-1', 'HASHED-BACKUP-2', 'HASHED-BACKUP-3', 'HASHED-BACKUP-4'],
  }),
  verifyBackupCode: async (code: string, hashedCodes: string[]) => {
    if (code === 'BACKUP1' && hashedCodes.includes('HASHED-BACKUP-1')) {
      return {
        valid: true,
        remainingCodes: hashedCodes.filter((item) => item !== 'HASHED-BACKUP-1'),
      }
    }
    return {
      valid: false,
      remainingCodes: hashedCodes,
    }
  },
}))

function uniqueDbPath(suffix = 'auth-2fa-routes'): string {
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

async function createApp(): Promise<Hono> {
  const { default: auth2faRoutes } = await import('./auth-2fa')
  const app = new Hono()
  app.route('/api/auth/2fa', auth2faRoutes)
  return app
}

async function insertUser(
  db: SqliteDb,
  opts: {
    id?: number
    username?: string
    password?: string
    totpEnabled?: number
    totpSecret?: string | null
    totpBackupCodes?: string | null
  } = {}
) {
  const id = opts.id ?? 1
  const username = opts.username ?? 'testuser'
  const password = opts.password ?? 'Password123!'
  const hashedPassword = await hashPassword(password)

  db.$client
    .prepare(
      'INSERT INTO users (id, username, password, email, "group", group_id, locked, image, auth_service, totp_secret, totp_enabled, totp_backup_codes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      id,
      username,
      hashedPassword,
      `${username}@example.com`,
      'User',
      4,
      0,
      null,
      'internal',
      opts.totpSecret ?? null,
      opts.totpEnabled ?? 0,
      opts.totpBackupCodes ?? null
    )

  return { id, username, password }
}

async function authHeader(userId: number, username: string): Promise<string> {
  const jwt = await createAccessToken(
    toAuthUser({
      id: userId,
      username,
      email: `${username}@example.com`,
      groupName: 'User',
      group_id: 4,
      image: null,
    })
  )

  return `Bearer ${jwt}`
}

describe('auth-2fa routes', () => {
  beforeEach(async () => {
    await closeDb()
    _clearSettingsCache()
    forceFindUserByIdNull.value = false
  })

  afterEach(async () => {
    await closeDb()
    _clearSettingsCache()
    forceFindUserByIdNull.value = false
  })

  describe('POST /api/auth/2fa/setup', () => {
    it('should return secret, qrUri, backupCodes', async () => {
      const db = await setupDb()
      const user = await insertUser(db)
      const app = await createApp()

      const res = await app.request('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          Authorization: await authHeader(user.id, user.username),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      const json = (await res.json()) as {
        data: { secret: string; qrUri: string; backupCodes: string[] }
      }

      expect(res.status).toBe(200)
      expect(json.data.secret).toBe(`SECRET_${user.username}`)
      expect(json.data.qrUri).toContain('otpauth://totp/')
      expect(json.data.backupCodes.length).toBe(8)
    })

    it('should return TWO_FACTOR_ALREADY_ENABLED', async () => {
      const db = await setupDb()
      const user = await insertUser(db, {
        totpEnabled: 1,
        totpSecret: encryptSecret('ANYSECRET'),
      })
      const app = await createApp()

      const res = await app.request('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          Authorization: await authHeader(user.id, user.username),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      const json = (await res.json()) as { error: { code: string } }

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('TWO_FACTOR_ALREADY_ENABLED')
    })

    it('should return UNAUTHORIZED when missing auth', async () => {
      await setupDb()
      const app = await createApp()

      const res = await app.request('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = (await res.json()) as { error: { code: string } }

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should return USER_NOT_FOUND', async () => {
      await setupDb()
      const app = await createApp()

      const res = await app.request('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          Authorization: await authHeader(999, 'ghost'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      const json = (await res.json()) as { error: { code: string } }

      expect(res.status).toBe(404)
      expect(json.error.code).toBe('USER_NOT_FOUND')
    })
  })

  describe('POST /api/auth/2fa/verify-setup', () => {
    it('should return success for valid TOTP code', async () => {
      const db = await setupDb()
      const user = await insertUser(db)
      const app = await createApp()

      const res = await app.request('/api/auth/2fa/verify-setup', {
        method: 'POST',
        headers: {
          Authorization: await authHeader(user.id, user.username),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ secret: 'ANYSECRET', token: '123456' }),
      })
      const json = (await res.json()) as { data: { success: boolean } }

      expect(res.status).toBe(200)
      expect(json.data.success).toBe(true)
    })

    it('should return INVALID_TOTP_CODE for invalid token', async () => {
      const db = await setupDb()
      const user = await insertUser(db)
      const app = await createApp()

      const res = await app.request('/api/auth/2fa/verify-setup', {
        method: 'POST',
        headers: {
          Authorization: await authHeader(user.id, user.username),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ secret: 'ANYSECRET', token: '654321' }),
      })
      const json = (await res.json()) as { error: { code: string } }

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('INVALID_TOTP_CODE')
    })

    it('should return VALIDATION_ERROR for invalid body', async () => {
      const db = await setupDb()
      const user = await insertUser(db)
      const app = await createApp()

      const res = await app.request('/api/auth/2fa/verify-setup', {
        method: 'POST',
        headers: {
          Authorization: await authHeader(user.id, user.username),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      const json = (await res.json()) as { error: { code: string } }

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 401 when not authenticated', async () => {
      await setupDb()
      const app = await createApp()

      const res = await app.request('/api/auth/2fa/verify-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: 'ANYSECRET', token: '123456' }),
      })

      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/auth/2fa/verify', () => {
    it('should return access token and user for valid totp_code', async () => {
      const db = await setupDb()
      const user = await insertUser(db, {
        totpEnabled: 1,
        totpSecret: encryptSecret('ANYSECRET'),
      })
      const tempToken = await createTempToken(user.id)
      const app = await createApp()

      const res = await app.request('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temp_token: tempToken, totp_code: '123456' }),
      })
      const json = (await res.json()) as { data: { accessToken: string; user: { id: number } } }

      expect(res.status).toBe(200)
      expect(json.data.accessToken).toBeDefined()
      expect(json.data.user.id).toBe(user.id)
      expect(res.headers.get('set-cookie')).toContain('organizrx_refresh=')
    })

    it('should return access token and user for valid backup_code', async () => {
      const db = await setupDb()
      const user = await insertUser(db, {
        totpEnabled: 1,
        totpSecret: encryptSecret('ANYSECRET'),
        totpBackupCodes: JSON.stringify(['HASHED-BACKUP-1', 'HASHED-BACKUP-2']),
      })
      const tempToken = await createTempToken(user.id)
      const app = await createApp()

      const res = await app.request('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temp_token: tempToken, backup_code: 'BACKUP1' }),
      })
      const json = (await res.json()) as { data: { accessToken: string; user: { id: number } } }

      expect(res.status).toBe(200)
      expect(json.data.accessToken).toBeDefined()
      expect(json.data.user.id).toBe(user.id)
      expect(res.headers.get('set-cookie')).toContain('organizrx_refresh=')
    })

    it('should return INVALID_TOKEN for invalid temp_token', async () => {
      await setupDb()
      const app = await createApp()

      const res = await app.request('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temp_token: 'invalid', totp_code: '123456' }),
      })
      const json = (await res.json()) as { error: { code: string } }

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('INVALID_TOKEN')
    })

    it('should return INVALID_CODE for invalid totp_code', async () => {
      const db = await setupDb()
      const user = await insertUser(db, {
        totpEnabled: 1,
        totpSecret: encryptSecret('ANYSECRET'),
      })
      const tempToken = await createTempToken(user.id)
      const app = await createApp()

      const res = await app.request('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temp_token: tempToken, totp_code: '654321' }),
      })
      const json = (await res.json()) as { error: { code: string } }

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('INVALID_CODE')
    })

    it('should return TWO_FACTOR_NOT_ENABLED when disabled', async () => {
      const db = await setupDb()
      const user = await insertUser(db)
      const tempToken = await createTempToken(user.id)
      const app = await createApp()

      const res = await app.request('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temp_token: tempToken, totp_code: '123456' }),
      })
      const json = (await res.json()) as { error: { code: string } }

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('TWO_FACTOR_NOT_ENABLED')
    })

    it('should return VALIDATION_ERROR when neither code is provided', async () => {
      const db = await setupDb()
      const user = await insertUser(db, {
        totpEnabled: 1,
        totpSecret: encryptSecret('ANYSECRET'),
      })
      const tempToken = await createTempToken(user.id)
      const app = await createApp()

      const res = await app.request('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temp_token: tempToken }),
      })
      const json = (await res.json()) as { error: { code: string } }

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return USER_NOT_FOUND when lookup fails after code validation', async () => {
      const db = await setupDb()
      const user = await insertUser(db, {
        totpEnabled: 1,
        totpSecret: encryptSecret('ANYSECRET'),
      })
      const tempToken = await createTempToken(user.id)
      forceFindUserByIdNull.value = true
      const app = await createApp()

      const res = await app.request('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temp_token: tempToken, totp_code: '123456' }),
      })
      const json = (await res.json()) as { error: { code: string } }

      expect(res.status).toBe(404)
      expect(json.error.code).toBe('USER_NOT_FOUND')
    })
  })

  describe('DELETE /api/auth/2fa', () => {
    it('should disable 2FA successfully', async () => {
      const db = await setupDb()
      const user = await insertUser(db, {
        totpEnabled: 1,
        totpSecret: encryptSecret('ANYSECRET'),
      })
      const app = await createApp()

      const res = await app.request('/api/auth/2fa', {
        method: 'DELETE',
        headers: {
          Authorization: await authHeader(user.id, user.username),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: user.password }),
      })
      const json = (await res.json()) as { data: { success: boolean } }

      expect(res.status).toBe(200)
      expect(json.data.success).toBe(true)
    })

    it('should return INVALID_PASSWORD for wrong password', async () => {
      const db = await setupDb()
      const user = await insertUser(db, {
        totpEnabled: 1,
        totpSecret: encryptSecret('ANYSECRET'),
      })
      const app = await createApp()

      const res = await app.request('/api/auth/2fa', {
        method: 'DELETE',
        headers: {
          Authorization: await authHeader(user.id, user.username),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: 'WrongPassword!' }),
      })
      const json = (await res.json()) as { error: { code: string } }

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('INVALID_PASSWORD')
    })

    it('should return TWO_FACTOR_NOT_ENABLED when 2FA is disabled', async () => {
      const db = await setupDb()
      const user = await insertUser(db)
      const app = await createApp()

      const res = await app.request('/api/auth/2fa', {
        method: 'DELETE',
        headers: {
          Authorization: await authHeader(user.id, user.username),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: user.password }),
      })
      const json = (await res.json()) as { error: { code: string } }

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('TWO_FACTOR_NOT_ENABLED')
    })

    it('should return UNAUTHORIZED when missing auth', async () => {
      await setupDb()
      const app = await createApp()

      const res = await app.request('/api/auth/2fa', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'Password123!' }),
      })
      const json = (await res.json()) as { error: { code: string } }

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should return USER_NOT_FOUND when authenticated user is missing', async () => {
      const db = await setupDb()
      const user = await insertUser(db, {
        totpEnabled: 1,
        totpSecret: encryptSecret('ANYSECRET'),
      })
      const app = await createApp()
      const header = await authHeader(user.id, user.username)
      forceFindUserByIdNull.value = true

      const res = await app.request('/api/auth/2fa', {
        method: 'DELETE',
        headers: {
          Authorization: header,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: user.password }),
      })
      const json = (await res.json()) as { error: { code: string } }

      expect(res.status).toBe(404)
      expect(json.error.code).toBe('USER_NOT_FOUND')
    })
  })
})
