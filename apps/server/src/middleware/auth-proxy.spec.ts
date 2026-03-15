import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'
import { Hono } from 'hono'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import { _clearSettingsCache } from '../services/settings'
type ProxyTokenResult = { token: string } | null
type AuthenticateProxyUserFn = () => Promise<ProxyTokenResult>

const mockAuthenticateProxyUser = mock<AuthenticateProxyUserFn>(() => Promise.resolve(null))

mock.module('../services/auth-proxy', () => ({
  authenticateProxyUser: mockAuthenticateProxyUser,
}))

function uniqueDbPath(suffix = 'auth-proxy-middleware'): string {
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

  db.$client.exec(`
    INSERT INTO users (id, username, email, "group", group_id, image)
    VALUES (42, 'proxyuser', 'proxy@test.local', 'User', 4, NULL)
  `)

  return db
}

async function createApp(): Promise<
  Hono<{
    Variables: {
      user: {
        name: string
        groupName: string | null
        groupID: number | null
        userID: number
        email: string | null
        image: string | null
      }
    }
  }>
> {
  const { authProxyMiddleware } = await import('./auth-proxy')

  const app = new Hono<{
    Variables: {
      user: {
        name: string
        groupName: string | null
        groupID: number | null
        userID: number
        email: string | null
        image: string | null
      }
    }
  }>()
  app.use('*', authProxyMiddleware())
  app.get('/test', (c) => {
    const user = c.get('user')
    return c.json({
      data: {
        ok: true,
        user,
      },
    })
  })

  return app
}

describe('auth-proxy middleware', () => {
  beforeEach(async () => {
    await closeDb()
    _clearSettingsCache()
    await setupDb()

    const { createAccessToken, toAuthUser } = await import('../services/auth')
    const authUser = toAuthUser({
      id: 42,
      username: 'proxyuser',
      email: 'proxy@test.local',
      groupName: 'User',
      group_id: 4,
      image: null,
    })
    const realToken = await createAccessToken(authUser)

    mockAuthenticateProxyUser.mockClear()
    mockAuthenticateProxyUser.mockImplementation(() => Promise.resolve({ token: realToken }))
  })

  afterEach(async () => {
    await closeDb()
    _clearSettingsCache()
  })

  it('sets user when proxy auth succeeds', async () => {
    const app = await createApp()

    const res = await app.request('/test', {
      headers: {
        'X-Real-IP': '127.0.0.1',
        'X-Forwarded-User': 'proxyuser',
      },
    })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.ok).toBe(true)
    expect(json.data.user).toBeDefined()
    expect(json.data.user.userID).toBe(42)
  })

  it('passes through when no proxy headers', async () => {
    mockAuthenticateProxyUser.mockImplementation(() => Promise.resolve(null))

    const app = await createApp()
    const res = await app.request('/test')
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.ok).toBe(true)
    expect(json.data.user).toBeUndefined()
  })

  it('passes through on auth service error', async () => {
    mockAuthenticateProxyUser.mockImplementation(() => Promise.reject(new Error('service error')))

    const app = await createApp()
    const res = await app.request('/test', {
      headers: {
        'X-Real-IP': '127.0.0.1',
        'X-Forwarded-User': 'proxyuser',
      },
    })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.ok).toBe(true)
    expect(json.data.user).toBeUndefined()
  })

  it('passes through on invalid token', async () => {
    mockAuthenticateProxyUser.mockImplementation(() => Promise.resolve({ token: 'invalid-token' }))

    const app = await createApp()
    const res = await app.request('/test', {
      headers: {
        'X-Real-IP': '127.0.0.1',
        'X-Forwarded-User': 'proxyuser',
      },
    })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.ok).toBe(true)
    expect(json.data.user).toBeUndefined()
  })

  it('passes through when DB not ready', async () => {
    mockAuthenticateProxyUser.mockImplementation(() =>
      Promise.reject(new Error('no such table: options'))
    )

    const app = await createApp()
    const res = await app.request('/test', {
      headers: {
        'X-Real-IP': '127.0.0.1',
        'X-Forwarded-User': 'proxyuser',
      },
    })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.ok).toBe(true)
    expect(json.data.user).toBeUndefined()
  })
})
