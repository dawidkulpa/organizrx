import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'
import { Hono } from 'hono'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import { _clearSettingsCache } from '../services/settings'
import { _resetLockoutMap } from '../services/auth'

type MockAuthUser = {
  id: number
  username: string
  email: string | null
  groupName: string | null
  group_id: number | null
  image: string | null
}

type MockLdapUser = {
  username: string
  email: string | null
  displayName: string | null
  groups: string[]
}

type AuthenticateLdapFn = () => Promise<MockLdapUser | null>

const mockTestLdapConnection = mock(() =>
  Promise.resolve({ success: true, message: 'LDAP connection successful' })
)
const mockAuthenticateLdap = mock<AuthenticateLdapFn>(() =>
  Promise.resolve({
    username: 'ldapuser',
    email: 'ldap@test.local',
    displayName: 'LDAP User',
    groups: ['CN=Users,DC=test,DC=local'],
  } satisfies MockLdapUser)
)
const mockMapLdapGroupToOrganizr = mock(() => 4)
const mockFindOrCreateLdapUser = mock(() =>
  Promise.resolve({
    id: 10,
    username: 'ldapuser',
    email: 'ldap@test.local',
    groupName: 'User',
    group_id: 4,
    image: null,
  } satisfies MockAuthUser)
)
const mockIsLdapEnabled = mock(() => Promise.resolve(true))
const mockLoadLdapConfig = mock(() =>
  Promise.resolve({
    host: 'ldap.test.local',
    port: 389,
    baseDn: 'dc=test,dc=local',
    bindUsername: 'cn=admin,dc=test,dc=local',
    bindPassword: 'secret',
    ldapType: 'ad',
    ssl: false,
    tls: false,
    searchFilter: '',
    groupMapping: {},
  })
)

mock.module('../services/auth-ldap', () => ({
  testLdapConnection: mockTestLdapConnection,
  authenticateLdap: mockAuthenticateLdap,
  mapLdapGroupToOrganizr: mockMapLdapGroupToOrganizr,
  findOrCreateLdapUser: mockFindOrCreateLdapUser,
  isLdapEnabled: mockIsLdapEnabled,
  loadLdapConfig: mockLoadLdapConfig,
}))

function uniqueDbPath(suffix = 'ldap-routes'): string {
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
  const { default: ldapAuthRoutes } = await import('./auth-ldap')
  const app = new Hono()
  app.route('/api/auth', ldapAuthRoutes)
  return app
}

describe('auth-ldap routes', () => {
  beforeEach(async () => {
    await closeDb()
    _clearSettingsCache()
    _resetLockoutMap()

    mockTestLdapConnection.mockClear()
    mockAuthenticateLdap.mockClear()
    mockMapLdapGroupToOrganizr.mockClear()
    mockFindOrCreateLdapUser.mockClear()
    mockIsLdapEnabled.mockClear()
    mockLoadLdapConfig.mockClear()

    mockTestLdapConnection.mockImplementation(() =>
      Promise.resolve({ success: true, message: 'LDAP connection successful' })
    )
    mockAuthenticateLdap.mockImplementation(() =>
      Promise.resolve({
        username: 'ldapuser',
        email: 'ldap@test.local',
        displayName: 'LDAP User',
        groups: ['CN=Users,DC=test,DC=local'],
      } satisfies MockLdapUser)
    )
    mockMapLdapGroupToOrganizr.mockImplementation(() => 4)
    mockFindOrCreateLdapUser.mockImplementation(() =>
      Promise.resolve({
        id: 10,
        username: 'ldapuser',
        email: 'ldap@test.local',
        groupName: 'User',
        group_id: 4,
        image: null,
      } satisfies MockAuthUser)
    )
    mockIsLdapEnabled.mockImplementation(() => Promise.resolve(true))
    mockLoadLdapConfig.mockImplementation(() =>
      Promise.resolve({
        host: 'ldap.test.local',
        port: 389,
        baseDn: 'dc=test,dc=local',
        bindUsername: 'cn=admin,dc=test,dc=local',
        bindPassword: 'secret',
        ldapType: 'ad',
        ssl: false,
        tls: false,
        searchFilter: '',
        groupMapping: {},
      })
    )
  })

  afterEach(async () => {
    await closeDb()
    _clearSettingsCache()
  })

  describe('POST /api/auth/ldap/test', () => {
    it('returns 200 for successful LDAP test', async () => {
      await setupDb()
      const app = await createApp()
      const { createAccessToken, toAuthUser } = await import('../services/auth')
      const authUser = toAuthUser({
        id: 1,
        username: 'admin',
        email: 'admin@test.local',
        groupName: 'Admin',
        group_id: 0,
        image: null,
      })
      const jwt = await createAccessToken(authUser)

      const res = await app.request('/api/auth/ldap/test', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: 'ldap.test.local',
          port: 389,
          baseDn: 'dc=test,dc=local',
          bindUsername: 'cn=admin,dc=test,dc=local',
          bindPassword: 'secret',
          ldapType: 'ad',
          ssl: false,
          tls: false,
          searchFilter: '',
          groupMapping: {},
        }),
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.success).toBe(true)
      expect(json.data.message).toBe('LDAP connection successful')
    })

    it('returns 500 when LDAP connection throws', async () => {
      await setupDb()
      mockTestLdapConnection.mockImplementation(() =>
        Promise.reject(new Error('Connection refused'))
      )

      const app = await createApp()
      const { createAccessToken, toAuthUser } = await import('../services/auth')
      const authUser = toAuthUser({
        id: 1,
        username: 'admin',
        email: 'admin@test.local',
        groupName: 'Admin',
        group_id: 0,
        image: null,
      })
      const jwt = await createAccessToken(authUser)
      const res = await app.request('/api/auth/ldap/test', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: 'ldap.test.local',
          port: 389,
          baseDn: 'dc=test,dc=local',
        }),
      })

      expect(res.status).toBe(500)
    })

    it('returns 401 when not authenticated', async () => {
      await setupDb()
      const app = await createApp()

      const res = await app.request('/api/auth/ldap/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: 'ldap.test.local',
          port: 389,
          baseDn: 'dc=test,dc=local',
        }),
      })
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('returns 403 for non-admin user', async () => {
      await setupDb()
      const app = await createApp()
      const { createAccessToken, toAuthUser } = await import('../services/auth')
      const authUser = toAuthUser({
        id: 2,
        username: 'user',
        email: 'user@test.local',
        groupName: 'User',
        group_id: 4,
        image: null,
      })
      const jwt = await createAccessToken(authUser)

      const res = await app.request('/api/auth/ldap/test', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: 'ldap.test.local',
          port: 389,
          baseDn: 'dc=test,dc=local',
        }),
      })
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })

  describe('POST /api/auth/ldap/login', () => {
    it('returns 200 with accessToken and user on successful LDAP login', async () => {
      const db = await setupDb()
      const app = await createApp()

      const res = await app.request('/api/auth/ldap/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'bun-test' },
        body: JSON.stringify({ username: 'ldapuser', password: 'password123', rememberMe: true }),
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.accessToken).toBeDefined()
      expect(typeof json.data.accessToken).toBe('string')
      expect(json.data.user.username).toBe('ldapuser')
      expect(res.headers.get('set-cookie')).toContain('organizrx_refresh=')
      const tokens = db.$client.query('SELECT * FROM tokens WHERE user_id = 10').all() as Array<
        Record<string, unknown>
      >
      expect(tokens.length).toBe(1)
    })

    it('returns 400 when LDAP is disabled', async () => {
      await setupDb()
      mockIsLdapEnabled.mockImplementation(() => Promise.resolve(false))

      const app = await createApp()
      const res = await app.request('/api/auth/ldap/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'ldapuser', password: 'password123' }),
      })
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('LDAP_DISABLED')
    })

    it('returns 401 for invalid LDAP credentials', async () => {
      await setupDb()
      mockAuthenticateLdap.mockImplementation(() => Promise.resolve(null))

      const app = await createApp()
      const res = await app.request('/api/auth/ldap/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'ldapuser', password: 'wrong-password' }),
      })
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('INVALID_CREDENTIALS')
    })

    it('returns 400 for validation errors', async () => {
      await setupDb()
      const app = await createApp()

      const res = await app.request('/api/auth/ldap/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: '', password: 'password123' }),
      })
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('returns 500 when LDAP user exists but local creation is rejected', async () => {
      await setupDb()
      mockFindOrCreateLdapUser.mockImplementation(() =>
        Promise.reject(new Error('Auto-create disabled'))
      )

      const app = await createApp()
      const res = await app.request('/api/auth/ldap/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'ldapuser', password: 'password123' }),
      })
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.error.code).toBe('LDAP_ERROR')
    })

    it('returns 500 when LDAP bind fails', async () => {
      await setupDb()
      mockAuthenticateLdap.mockImplementation(() => Promise.reject(new Error('LDAP bind failed')))

      const app = await createApp()
      const res = await app.request('/api/auth/ldap/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'ldapuser', password: 'password123' }),
      })
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.error.code).toBe('LDAP_ERROR')
      expect(json.error.message).toBe('LDAP bind failed')
    })
  })
})
