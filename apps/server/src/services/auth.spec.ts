import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import {
  hashPassword,
  verifyPassword,
  createAccessToken,
  verifyAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  storeRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  isRefreshTokenValid,
  checkLockout,
  recordFailedAttempt,
  clearFailedAttempts,
  toAuthUser,
  _resetLockoutMap,
} from './auth'

import type { AuthUser } from '@organizrx/shared'

function uniqueDbPath(suffix = 'auth'): string {
  const dir = join(tmpdir(), 'organizrx-test-' + process.pid)
  mkdirSync(dir, { recursive: true })
  return join(dir, `test-${suffix}-${Date.now()}.db`)
}

const testUser: AuthUser = {
  id: 1,
  username: 'admin',
  email: 'admin@test.com',
  groupName: 'Admin',
  group_id: 0,
  image: null,
}

async function setupDb() {
  _resetConfig()
  await initConfig()
  const dbPath = uniqueDbPath()
  await initDb({ dialect: 'sqlite', url: dbPath })

  const db = getRawDb() as SqliteDb

  // Create tables manually via raw SQLite
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

  return db
}

describe('auth service', () => {
  beforeEach(async () => {
    await closeDb()
    _resetLockoutMap()
  })

  afterEach(async () => {
    await closeDb()
    _resetLockoutMap()
  })

  // -------------------------------------------------------------------------
  // Password hashing
  // -------------------------------------------------------------------------

  describe('password hashing', () => {
    it('should hash and verify a password', async () => {
      await setupDb()
      const hash = await hashPassword('secret123')

      expect(hash).toStartWith('$2')
      expect(await verifyPassword('secret123', hash)).toBe(true)
      expect(await verifyPassword('wrong', hash)).toBe(false)
    })

    // Bun.password handles $2y$ (PHP) prefixes natively
    it('should verify a legacy PHP $2y$ hash', async () => {
      await setupDb()
      const hash = await hashPassword('testpass')
      // Bun generates $2b$ — manually create $2y$ variant
      const legacyHash = hash.replace('$2b$', '$2y$')

      expect(await verifyPassword('testpass', legacyHash)).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // JWT access tokens
  // -------------------------------------------------------------------------

  describe('access tokens', () => {
    it('should create and verify an access token', async () => {
      await setupDb()
      const token = await createAccessToken(testUser)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')

      const payload = await verifyAccessToken(token)
      expect(payload.name).toBe('admin')
      expect(payload.userID).toBe(1)
      expect(payload.groupID).toBe(0)
      expect(payload.email).toBe('admin@test.com')
      expect(payload.iss).toBe('OrganizrX')
      expect(payload.sub).toBe('1')
    })

    it('should reject a tampered token', async () => {
      await setupDb()
      const token = await createAccessToken(testUser)
      const tampered = token.slice(0, -5) + 'xxxxx'

      expect(verifyAccessToken(tampered)).rejects.toThrow()
    })

    it('should reject a token with wrong issuer', async () => {
      await setupDb()
      const { SignJWT } = await import('jose')
      const secret = new TextEncoder().encode(
        'dev-secret-do-not-use-in-production!!'
      )

      const wrongIssuer = await new SignJWT({ userID: 1, name: 'test' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer('WrongApp')
        .setExpirationTime('15m')
        .sign(secret)

      expect(verifyAccessToken(wrongIssuer)).rejects.toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // JWT refresh tokens
  // -------------------------------------------------------------------------

  describe('refresh tokens', () => {
    it('should create and verify a refresh token', async () => {
      await setupDb()
      const token = await createRefreshToken(1)

      const payload = await verifyRefreshToken(token)
      expect(payload.userId).toBe(1)
      expect(payload.type).toBe('refresh')
      expect(payload.sub).toBe('1')
    })

    it('should reject an access token when expecting refresh', async () => {
      await setupDb()
      const accessToken = await createAccessToken(testUser)

      expect(verifyRefreshToken(accessToken)).rejects.toThrow('expected refresh token')
    })
  })

  // -------------------------------------------------------------------------
  // Token storage (DB)
  // -------------------------------------------------------------------------

  describe('token storage', () => {
    it('should store and validate a refresh token', async () => {
      await setupDb()
      const token = await createRefreshToken(1)

      await storeRefreshToken({
        userId: 1,
        token,
        browser: 'TestAgent',
        ip: '127.0.0.1',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })

      expect(await isRefreshTokenValid(token)).toBe(true)
    })

    it('should return false for non-existent token', async () => {
      await setupDb()
      expect(await isRefreshTokenValid('nonexistent')).toBe(false)
    })

    it('should return false for expired token in DB', async () => {
      await setupDb()
      const token = 'expired-token-123'

      await storeRefreshToken({
        userId: 1,
        token,
        browser: null,
        ip: null,
        expiresAt: new Date(Date.now() - 1000), // already expired
      })

      expect(await isRefreshTokenValid(token)).toBe(false)
    })

    it('should revoke a specific token', async () => {
      await setupDb()
      const token = await createRefreshToken(1)

      await storeRefreshToken({
        userId: 1,
        token,
        browser: null,
        ip: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })

      expect(await isRefreshTokenValid(token)).toBe(true)
      await revokeRefreshToken(token)
      expect(await isRefreshTokenValid(token)).toBe(false)
    })

    it('should revoke all tokens for a user', async () => {
      await setupDb()
      const token1 = await createRefreshToken(1)
      const token2 = await createRefreshToken(1)

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      await storeRefreshToken({ userId: 1, token: token1, browser: null, ip: null, expiresAt })
      await storeRefreshToken({ userId: 1, token: token2, browser: null, ip: null, expiresAt })

      expect(await isRefreshTokenValid(token1)).toBe(true)
      expect(await isRefreshTokenValid(token2)).toBe(true)

      await revokeAllUserTokens(1)

      expect(await isRefreshTokenValid(token1)).toBe(false)
      expect(await isRefreshTokenValid(token2)).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // Lockout logic
  // -------------------------------------------------------------------------

  describe('lockout', () => {
    it('should not be locked by default', async () => {
      await setupDb()
      const result = checkLockout('admin')
      expect(result.locked).toBe(false)
      expect(result.remainingMs).toBe(0)
    })

    it('should lock after max attempts (default 5)', async () => {
      await setupDb()
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt('admin')
      }

      const result = checkLockout('admin')
      expect(result.locked).toBe(true)
      expect(result.remainingMs).toBeGreaterThan(0)
    })

    it('should be case-insensitive', async () => {
      await setupDb()
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt('Admin')
      }

      expect(checkLockout('admin').locked).toBe(true)
      expect(checkLockout('ADMIN').locked).toBe(true)
    })

    it('should clear lockout on successful login', async () => {
      await setupDb()
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt('admin')
      }

      expect(checkLockout('admin').locked).toBe(true)
      clearFailedAttempts('admin')
      expect(checkLockout('admin').locked).toBe(false)
    })

    it('should not lock before threshold', async () => {
      await setupDb()
      for (let i = 0; i < 4; i++) {
        recordFailedAttempt('admin')
      }

      expect(checkLockout('admin').locked).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // toAuthUser helper
  // -------------------------------------------------------------------------

  describe('toAuthUser', () => {
    it('should map db row to AuthUser', () => {
      const user = toAuthUser({
        id: 1,
        username: 'admin',
        email: 'a@b.com',
        groupName: 'Admin',
        group_id: 0,
        image: null,
      })

      expect(user).toEqual({
        id: 1,
        username: 'admin',
        email: 'a@b.com',
        groupName: 'Admin',
        group_id: 0,
        image: null,
      })
    })

    it('should default null username to empty string', () => {
      const user = toAuthUser({
        id: 2,
        username: null,
        email: null,
        groupName: null,
        group_id: null,
        image: null,
      })

      expect(user.username).toBe('')
    })
  })
})
