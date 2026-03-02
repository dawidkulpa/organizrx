import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import {
  initiatePlexAuth,
  pollPlexAuth,
  verifyPlexToken,
  checkPlexServerAccess,
  findOrCreatePlexUser,
  linkPlexAccount,
  type PlexPinResponse,
  type PlexUserInfo,
} from './auth-plex'
import { _clearSettingsCache } from './settings'

function uniqueDbPath(suffix = 'plex'): string {
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

  // Create tables
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

describe('auth-plex service', () => {
  beforeEach(async () => {
    await closeDb()
    _clearSettingsCache()
  })

  afterEach(async () => {
    await closeDb()
    _clearSettingsCache()
  })

  // -------------------------------------------------------------------------
  // Plex PIN Initiation
  // -------------------------------------------------------------------------

  describe('initiatePlexAuth', () => {
    it('should successfully request PIN from Plex API', async () => {
      await setupDb()

      const mockResponse: PlexPinResponse = {
        id: 123456,
        code: 'ABCD',
        authToken: null,
      }

      const fetchMock = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      )
      global.fetch = fetchMock as unknown as typeof fetch

      const result = await initiatePlexAuth()

      expect(result.pinId).toBe(123456)
      expect(result.code).toBe('ABCD')
      expect(result.authUrl).toContain('https://app.plex.tv/auth')
      expect(result.authUrl).toContain('code=ABCD')
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('should throw error on failed PIN request', async () => {
      await setupDb()

      const fetchMock = mock(() =>
        Promise.resolve({
          ok: false,
          statusText: 'Bad Request',
        })
      )
      global.fetch = fetchMock as unknown as typeof fetch

      await expect(initiatePlexAuth()).rejects.toThrow('Plex PIN request failed')
    })
  })

  // -------------------------------------------------------------------------
  // Plex PIN Polling
  // -------------------------------------------------------------------------

  describe('pollPlexAuth', () => {
    it('should return null if PIN not yet authorized', async () => {
      await setupDb()

      const mockResponse: PlexPinResponse = {
        id: 123456,
        code: 'ABCD',
        authToken: null,
      }

      const fetchMock = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      )
      global.fetch = fetchMock as unknown as typeof fetch

      const result = await pollPlexAuth(123456)

      expect(result).toBeNull()
    })

    it('should return auth token when PIN is authorized', async () => {
      await setupDb()

      const mockResponse: PlexPinResponse = {
        id: 123456,
        code: 'ABCD',
        authToken: 'test-plex-token-abc123',
      }

      const fetchMock = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      )
      global.fetch = fetchMock as unknown as typeof fetch

      const result = await pollPlexAuth(123456)

      expect(result).toBe('test-plex-token-abc123')
    })

    it('should throw error on failed poll request', async () => {
      await setupDb()

      const fetchMock = mock(() =>
        Promise.resolve({
          ok: false,
          statusText: 'Not Found',
        })
      )
      global.fetch = fetchMock as unknown as typeof fetch

      await expect(pollPlexAuth(123456)).rejects.toThrow('Plex PIN poll failed')
    })
  })

  // -------------------------------------------------------------------------
  // Plex Token Verification
  // -------------------------------------------------------------------------

  describe('verifyPlexToken', () => {
    it('should return user info for valid token', async () => {
      const fetchMock = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPlexUser),
        })
      )
      global.fetch = fetchMock as unknown as typeof fetch

      await setupDb()
      const result = await verifyPlexToken('test-token')

      expect(result.id).toBe(12345)
      expect(result.email).toBe('plex@test.com')
      expect(result.username).toBe('plexuser')
    })

    it('should throw error for invalid token', async () => {
      const fetchMock = mock(() =>
        Promise.resolve({
          ok: false,
          statusText: 'Unauthorized',
        })
      )
      global.fetch = fetchMock as unknown as typeof fetch

      await setupDb()
      await expect(verifyPlexToken('invalid-token')).rejects.toThrow('Plex user verification failed')
    })
  })

  // -------------------------------------------------------------------------
  // Server Access Check
  // -------------------------------------------------------------------------

  describe('checkPlexServerAccess', () => {
    it('should return true if user has access to server', async () => {
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
            json: () => Promise.resolve([
              { machineIdentifier: 'server-123', name: 'My Server' },
              { machineIdentifier: 'server-456', name: 'Other Server' },
            ]),
          })
        }
        return Promise.resolve({ ok: false })
      })
      global.fetch = fetchMock as unknown as typeof fetch

      await setupDb()
      const result = await checkPlexServerAccess('test-token', 'server-123')

      expect(result).toBe(true)
    })

    it('should return false if user does not have access to server', async () => {
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
            json: () => Promise.resolve([
              { machineIdentifier: 'server-456', name: 'Other Server' },
            ]),
          })
        }
        return Promise.resolve({ ok: false })
      })
      global.fetch = fetchMock as unknown as typeof fetch

      await setupDb()
      const result = await checkPlexServerAccess('test-token', 'server-123')

      expect(result).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // User Creation / Lookup
  // -------------------------------------------------------------------------

  describe('findOrCreatePlexUser', () => {
    it('should create new user if not exists', async () => {
      const db = await setupDb()

      const user = await findOrCreatePlexUser(mockPlexUser, 'test-token', 4)

      expect(user.username).toBe('plexuser')
      expect(user.email).toBe('plex@test.com')
      expect(user.group_id).toBe(4)
      expect(user.image).toBe('https://plex.tv/users/avatar.png')

      // Verify user was inserted
      const rows = db.$client.query('SELECT * FROM users').all()
      expect(rows.length).toBeGreaterThan(0)
    })

    it('should update existing user if found by email', async () => {
      const db = await setupDb()

      // Insert existing user
      db.$client.exec(`
        INSERT INTO users (username, password, email, group_id, auth_service)
        VALUES ('existinguser', 'hash', 'plex@test.com', 4, 'internal')
      `)

      const user = await findOrCreatePlexUser(mockPlexUser, 'test-token', 4)

      expect(user.username).toBe('existinguser')
      expect(user.email).toBe('plex@test.com')

      // Verify plex_token was updated
      const rows = db.$client.query('SELECT plex_token, auth_service FROM users WHERE email = ?').all('plex@test.com') as Array<{ plex_token: string | null; auth_service: string | null }>
      expect(rows[0].plex_token).toBe('test-token')
      expect(rows[0].auth_service).toBe('plex')
    })
  })

  // -------------------------------------------------------------------------
  // Link Plex Account
  // -------------------------------------------------------------------------

  describe('linkPlexAccount', () => {
    it('should link existing user to Plex account', async () => {
      const db = await setupDb()

      // Insert user
      db.$client.exec(`
        INSERT INTO users (id, username, password, email, group_id, auth_service)
        VALUES (1, 'testuser', 'hash', 'test@example.com', 4, 'internal')
      `)

      const fetchMock = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPlexUser),
        })
      )
      global.fetch = fetchMock as unknown as typeof fetch

      await linkPlexAccount(1, 'test-plex-token')

      // Verify plex_token was set
      const rows = db.$client.query('SELECT plex_token, auth_service, image FROM users WHERE id = ?').all(1) as Array<{ plex_token: string | null; auth_service: string | null; image: string | null }>
      expect(rows[0].plex_token).toBe('test-plex-token')
      expect(rows[0].auth_service).toBe('plex')
      expect(rows[0].image).toBe('https://plex.tv/users/avatar.png')
    })
  })
})
