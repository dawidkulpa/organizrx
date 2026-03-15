import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'
import { Hono } from 'hono'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import { _clearSettingsCache } from '../services/settings'
import {
  storeOidcState,
  retrieveAndDeleteOidcState,
  _resetOidcStateStore,
  type OidcConfig,
  type OidcAuthUrlResult,
  type OidcTokenResult,
  type OidcUserInfo,
} from '../services/auth-oidc'
import { createAccessToken, toAuthUser } from '../services/auth'
import type { AuthUser } from '@organizrx/shared'

const defaultOidcConfig: OidcConfig = {
  enabled: true,
  providerUrl: 'https://issuer.example.com',
  clientId: 'client-id',
  clientSecret: 'client-secret',
  scopes: 'openid profile email',
  redirectUri: 'http://localhost:3001/api/auth/oidc/callback',
  groupClaim: 'groups',
  groupMapping: { 'organizrx-admins': 0 },
  autoCreateUser: true,
  defaultGroupId: 4,
}

const defaultAuthUrlResult: OidcAuthUrlResult = {
  url: 'https://issuer.example.com/auth?state=test-state',
  state: 'test-state',
  codeVerifier: 'test-verifier',
  nonce: 'test-nonce',
}

const defaultClaims: Record<string, unknown> = {
  sub: 'oidc-sub-123',
  email: 'oidc@example.com',
  preferred_username: 'oidcuser',
  name: 'OIDC User',
  picture: 'https://example.com/avatar.png',
  groups: ['organizrx-admins'],
}

const defaultTokenResult: OidcTokenResult = {
  claims: defaultClaims,
  accessToken: 'provider-access-token',
}

const defaultAuthUser = toAuthUser({
  id: 1,
  username: 'oidcuser',
  email: 'oidc@example.com',
  groupName: 'Admin',
  group_id: 0,
  image: 'https://example.com/avatar.png',
})

type GetOidcConfigFn = () => Promise<OidcConfig>
type DiscoverOidcProviderFn = (
  issuerUrl: string,
  clientId: string,
  clientSecret: string
) => Promise<object>
type BuildOidcAuthUrlFn = (
  config: object,
  redirectUri: string,
  scopes: string
) => Promise<OidcAuthUrlResult>
type ExchangeOidcCodeFn = (
  config: object,
  callbackUrl: URL,
  codeVerifier: string,
  expectedState: string,
  expectedNonce: string
) => Promise<OidcTokenResult>
type FindOrCreateOidcUserFn = (
  oidcUser: OidcUserInfo,
  groupId: number,
  groupName: string,
  autoCreate: boolean
) => Promise<AuthUser | null>

const mockGetOidcConfig = mock<GetOidcConfigFn>(() => Promise.resolve(defaultOidcConfig))
const mockDiscoverOidcProvider = mock<DiscoverOidcProviderFn>(() => Promise.resolve({} as object))
const mockBuildOidcAuthUrl = mock<BuildOidcAuthUrlFn>(() => Promise.resolve(defaultAuthUrlResult))
const mockExchangeOidcCode = mock<ExchangeOidcCodeFn>(() => Promise.resolve(defaultTokenResult))
const mockFindOrCreateOidcUser = mock<FindOrCreateOidcUserFn>(() =>
  Promise.resolve(defaultAuthUser)
)
const mockLinkOidcAccount = mock(() => Promise.resolve())

mock.module('../services/auth-oidc/client', () => ({
  getOidcConfig: mockGetOidcConfig,
  discoverOidcProvider: mockDiscoverOidcProvider,
  buildOidcAuthUrl: mockBuildOidcAuthUrl,
  exchangeOidcCode: mockExchangeOidcCode,
}))

mock.module('../services/auth-oidc/db', () => ({
  findOrCreateOidcUser: mockFindOrCreateOidcUser,
  linkOidcAccount: mockLinkOidcAccount,
}))

function uniqueDbPath(suffix = 'oidc-routes'): string {
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
  const { default: oidcAuthRoutes } = await import('./auth-oidc')
  const app = new Hono()
  app.route('/api/auth/oidc', oidcAuthRoutes)
  return app
}

function seedState(state: string): void {
  storeOidcState(state, {
    codeVerifier: 'test-verifier',
    state,
    nonce: 'test-nonce',
    createdAt: Date.now(),
  })
}

function buildJwtForUser(userId = 1): Promise<string> {
  return createAccessToken(
    toAuthUser({
      id: userId,
      username: 'testuser',
      email: 'test@example.com',
      groupName: 'User',
      group_id: 4,
      image: null,
    })
  )
}

describe('auth-oidc routes', () => {
  beforeEach(async () => {
    await closeDb()
    _clearSettingsCache()
    _resetOidcStateStore()

    mockGetOidcConfig.mockReset()
    mockGetOidcConfig.mockImplementation(() => Promise.resolve(defaultOidcConfig))

    mockDiscoverOidcProvider.mockReset()
    mockDiscoverOidcProvider.mockImplementation(() => Promise.resolve({} as object))

    mockBuildOidcAuthUrl.mockReset()
    mockBuildOidcAuthUrl.mockImplementation(() => Promise.resolve(defaultAuthUrlResult))

    mockExchangeOidcCode.mockReset()
    mockExchangeOidcCode.mockImplementation(() => Promise.resolve(defaultTokenResult))

    mockFindOrCreateOidcUser.mockReset()
    mockFindOrCreateOidcUser.mockImplementation(() => Promise.resolve(defaultAuthUser))

    mockLinkOidcAccount.mockReset()
    mockLinkOidcAccount.mockImplementation(() => Promise.resolve())
  })

  afterEach(async () => {
    await closeDb()
    _clearSettingsCache()
    _resetOidcStateStore()
  })

  describe('GET /api/auth/oidc', () => {
    it('should return redirectUrl and state on happy path', async () => {
      await setupDb()
      const app = await createApp()

      const res = await app.request('/api/auth/oidc')
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.redirectUrl).toBe(defaultAuthUrlResult.url)
      expect(json.data.state).toBe(defaultAuthUrlResult.state)

      const stored = retrieveAndDeleteOidcState(defaultAuthUrlResult.state)
      expect(stored).not.toBeNull()
      expect(stored?.codeVerifier).toBe(defaultAuthUrlResult.codeVerifier)
    })

    it('should return 403 when OIDC is disabled', async () => {
      await setupDb()
      mockGetOidcConfig.mockImplementation(() =>
        Promise.resolve({ ...defaultOidcConfig, enabled: false })
      )

      const app = await createApp()
      const res = await app.request('/api/auth/oidc')
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.error.code).toBe('OIDC_DISABLED')
    })

    it('should return 500 when providerUrl is missing', async () => {
      await setupDb()
      mockGetOidcConfig.mockImplementation(() =>
        Promise.resolve({ ...defaultOidcConfig, providerUrl: '' })
      )

      const app = await createApp()
      const res = await app.request('/api/auth/oidc')
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.error.code).toBe('OIDC_NOT_CONFIGURED')
    })

    it('should return 500 when clientId is missing', async () => {
      await setupDb()
      mockGetOidcConfig.mockImplementation(() =>
        Promise.resolve({ ...defaultOidcConfig, clientId: '' })
      )

      const app = await createApp()
      const res = await app.request('/api/auth/oidc')
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.error.code).toBe('OIDC_NOT_CONFIGURED')
    })

    it('should return 500 when discovery fails', async () => {
      await setupDb()
      mockDiscoverOidcProvider.mockImplementation(() =>
        Promise.reject(new Error('Discovery failed'))
      )

      const app = await createApp()
      const res = await app.request('/api/auth/oidc')
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.error.code).toBe('OIDC_DISCOVERY_FAILED')
    })
  })

  describe('GET /api/auth/oidc/callback', () => {
    it('should return access token and user on valid callback', async () => {
      await setupDb()
      seedState('valid-state')

      const app = await createApp()
      const res = await app.request('/api/auth/oidc/callback?code=test-code&state=valid-state')
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.accessToken).toBeDefined()
      expect(json.data.user.username).toBe('oidcuser')
      expect(res.headers.get('set-cookie')).toContain('organizrx_refresh=')
    })

    it('should return 403 when OIDC is disabled', async () => {
      await setupDb()
      mockGetOidcConfig.mockImplementation(() =>
        Promise.resolve({ ...defaultOidcConfig, enabled: false })
      )

      const app = await createApp()
      const res = await app.request('/api/auth/oidc/callback?code=test-code&state=valid-state')
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.error.code).toBe('OIDC_DISABLED')
    })

    it('should return 400 when provider sends an error parameter', async () => {
      await setupDb()

      const app = await createApp()
      const res = await app.request(
        '/api/auth/oidc/callback?error=access_denied&error_description=User+denied'
      )
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('OIDC_PROVIDER_ERROR')
      expect(json.error.message).toBe('User denied')
    })

    it('should return 400 when code is missing', async () => {
      await setupDb()

      const app = await createApp()
      const res = await app.request('/api/auth/oidc/callback?state=valid-state')
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('OIDC_MISSING_PARAMS')
    })

    it('should return 400 when state is missing', async () => {
      await setupDb()

      const app = await createApp()
      const res = await app.request('/api/auth/oidc/callback?code=test-code')
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('OIDC_MISSING_PARAMS')
    })

    it('should return 400 when state is invalid', async () => {
      await setupDb()

      const app = await createApp()
      const res = await app.request('/api/auth/oidc/callback?code=test-code&state=missing-state')
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('OIDC_INVALID_STATE')
    })

    it('should consume state once and reject reuse', async () => {
      await setupDb()
      seedState('one-shot-state')

      const app = await createApp()

      const firstRes = await app.request(
        '/api/auth/oidc/callback?code=test-code&state=one-shot-state'
      )
      const firstJson = await firstRes.json()
      expect(firstRes.status).toBe(200)
      expect(firstJson.data.accessToken).toBeDefined()

      const secondRes = await app.request(
        '/api/auth/oidc/callback?code=test-code&state=one-shot-state'
      )
      const secondJson = await secondRes.json()
      expect(secondRes.status).toBe(400)
      expect(secondJson.error.code).toBe('OIDC_INVALID_STATE')
    })

    it('should return 400 when claims have no subject', async () => {
      await setupDb()
      seedState('valid-state')
      mockExchangeOidcCode.mockImplementation(() =>
        Promise.resolve({
          ...defaultTokenResult,
          claims: { ...defaultClaims, sub: '' },
        })
      )

      const app = await createApp()
      const res = await app.request('/api/auth/oidc/callback?code=test-code&state=valid-state')
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('OIDC_NO_SUBJECT')
    })

    it('should return 403 when auto-create is disabled and no user is found', async () => {
      await setupDb()
      seedState('valid-state')
      mockGetOidcConfig.mockImplementation(() =>
        Promise.resolve({ ...defaultOidcConfig, autoCreateUser: false })
      )
      mockFindOrCreateOidcUser.mockImplementation(() => Promise.resolve(null))

      const app = await createApp()
      const res = await app.request('/api/auth/oidc/callback?code=test-code&state=valid-state')
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.error.code).toBe('OIDC_USER_DENIED')
    })

    it('should return 500 when token exchange fails', async () => {
      await setupDb()
      seedState('valid-state')
      mockExchangeOidcCode.mockImplementation(() =>
        Promise.reject(new Error('Token exchange failed'))
      )

      const app = await createApp()
      const res = await app.request('/api/auth/oidc/callback?code=test-code&state=valid-state')
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.error.code).toBe('OIDC_AUTH_FAILED')
    })

    it('should map admin group claims to group_id 0', async () => {
      await setupDb()
      seedState('valid-state')

      mockExchangeOidcCode.mockImplementation(() =>
        Promise.resolve({
          ...defaultTokenResult,
          claims: {
            ...defaultClaims,
            groups: ['organizrx-admins'],
          },
        })
      )

      mockFindOrCreateOidcUser.mockImplementation((_oidcUserInfo, groupId, groupName) =>
        Promise.resolve(
          toAuthUser({
            id: 1,
            username: 'admin-user',
            email: 'admin@example.com',
            groupName,
            group_id: groupId,
            image: null,
          })
        )
      )

      const app = await createApp()
      const res = await app.request('/api/auth/oidc/callback?code=test-code&state=valid-state')
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.user.group_id).toBe(0)
    })

    it('should fall back to default group when claims groups are unmapped', async () => {
      await setupDb()
      seedState('valid-state')

      mockExchangeOidcCode.mockImplementation(() =>
        Promise.resolve({
          ...defaultTokenResult,
          claims: {
            ...defaultClaims,
            groups: ['unmapped-group'],
          },
        })
      )

      mockFindOrCreateOidcUser.mockImplementation(
        (_oidcUserInfo: OidcUserInfo, groupId: number, groupName: string) =>
          Promise.resolve(
            toAuthUser({
              id: 2,
              username: 'fallback-user',
              email: 'fallback@example.com',
              groupName,
              group_id: groupId,
              image: null,
            })
          )
      )

      const app = await createApp()
      const res = await app.request('/api/auth/oidc/callback?code=test-code&state=valid-state')
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.user.group_id).toBe(4)
    })
  })

  describe('POST /api/auth/oidc/link', () => {
    it('should link OIDC account for authenticated user', async () => {
      await setupDb()
      const jwt = await buildJwtForUser(1)
      const app = await createApp()

      const res = await app.request('/api/auth/oidc/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ oidcSub: 'oidc-sub-123' }),
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.success).toBe(true)
      expect(json.data.message).toBe('OIDC account linked successfully')
      expect(mockLinkOidcAccount).toHaveBeenCalledWith(1, 'oidc-sub-123')
    })

    it('should return 400 when oidcSub is missing', async () => {
      await setupDb()
      const jwt = await buildJwtForUser(1)
      const app = await createApp()

      const res = await app.request('/api/auth/oidc/link', {
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

    it('should return 401 when not authenticated', async () => {
      await setupDb()
      const app = await createApp()

      const res = await app.request('/api/auth/oidc/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oidcSub: 'oidc-sub-123' }),
      })
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 500 when linkOidcAccount throws', async () => {
      await setupDb()
      const jwt = await buildJwtForUser(1)
      mockLinkOidcAccount.mockImplementation(() => Promise.reject(new Error('link failed')))

      const app = await createApp()
      const res = await app.request('/api/auth/oidc/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ oidcSub: 'oidc-sub-123' }),
      })
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.error.code).toBe('OIDC_LINK_FAILED')
    })
  })
})
