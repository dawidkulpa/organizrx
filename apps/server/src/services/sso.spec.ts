import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import {
  getSsoConfig,
  getSsoCookies,
  buildSetCookieHeaders,
  buildClearCookieHeaders,
  appendSsoCookies,
  appendClearSsoCookies,
  DEFAULT_SSO_SERVICES,
} from './sso'
import { setSetting, _clearSettingsCache } from './settings'

function uniqueDbPath(suffix = 'sso'): string {
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

  // Create tables manually via raw SQLite
  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      value TEXT
    )
  `)

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT,
      email TEXT,
      plex_token TEXT,
      locked INTEGER DEFAULT 0,
      "group" TEXT,
      group_id INTEGER,
      image TEXT
    )
  `)

  return db
}

describe('sso service', () => {
  beforeEach(async () => {
    await closeDb()
    _clearSettingsCache()
  })

  afterEach(async () => {
    await closeDb()
    _clearSettingsCache()
  })

  // -------------------------------------------------------------------------
  // Default services
  // -------------------------------------------------------------------------

  describe('DEFAULT_SSO_SERVICES', () => {
    it('should have expected services', () => {
      const serviceNames = DEFAULT_SSO_SERVICES.map((s) => s.name)
      expect(serviceNames).toContain('plex')
      expect(serviceNames).toContain('jellyfin')
      expect(serviceNames).toContain('emby')
      expect(serviceNames).toContain('tautulli')
      expect(serviceNames).toContain('overseerr')
      expect(serviceNames).toContain('ombi')
      expect(serviceNames).toContain('petio')
      expect(serviceNames).toContain('komga')
    })

    it('should have correct cookie names', () => {
      const plex = DEFAULT_SSO_SERVICES.find((s) => s.name === 'plex')
      expect(plex?.cookie_name).toBe('X-Plex-Token')

      const jellyfin = DEFAULT_SSO_SERVICES.find((s) => s.name === 'jellyfin')
      expect(jellyfin?.cookie_name).toBe('jellyfin_credentials')

      const overseerr = DEFAULT_SSO_SERVICES.find((s) => s.name === 'overseerr')
      expect(overseerr?.cookie_name).toBe('connect.sid')
    })
  })

  // -------------------------------------------------------------------------
  // SSO configuration
  // -------------------------------------------------------------------------

  describe('getSsoConfig', () => {
    it('should return all services disabled by default', async () => {
      await setupDb()
      const config = await getSsoConfig()

      expect(config.length).toBe(DEFAULT_SSO_SERVICES.length)
      for (const service of config) {
        expect(service.enabled).toBe(false)
      }
    })

    it('should enable services when global and service flags are set', async () => {
      await setupDb()
      await setSetting('sso_enabled', '1')
      await setSetting('sso_plex_enabled', '1')

      const config = await getSsoConfig()
      const plex = config.find((s) => s.name === 'plex')

      expect(plex?.enabled).toBe(true)
    })

    it('should not enable service when global flag is off', async () => {
      await setupDb()
      await setSetting('sso_enabled', '0')
      await setSetting('sso_plex_enabled', '1')

      const config = await getSsoConfig()
      const plex = config.find((s) => s.name === 'plex')

      expect(plex?.enabled).toBe(false)
    })

    it('should allow custom cookie names', async () => {
      await setupDb()
      await setSetting('sso_enabled', '1')
      await setSetting('sso_plex_enabled', '1')
      await setSetting('sso_plex_cookie_name', 'CustomPlexToken')

      const config = await getSsoConfig()
      const plex = config.find((s) => s.name === 'plex')

      expect(plex?.cookie_name).toBe('CustomPlexToken')
    })

    it('should allow custom cookie domains and paths', async () => {
      await setupDb()
      await setSetting('sso_enabled', '1')
      await setSetting('sso_plex_enabled', '1')
      await setSetting('sso_plex_cookie_domain', '.example.com')
      await setSetting('sso_plex_cookie_path', '/plex')

      const config = await getSsoConfig()
      const plex = config.find((s) => s.name === 'plex')

      expect(plex?.cookie_domain).toBe('.example.com')
      expect(plex?.cookie_path).toBe('/plex')
    })
  })

  // -------------------------------------------------------------------------
  // Cookie generation
  // -------------------------------------------------------------------------

  describe('getSsoCookies', () => {
    it('should return empty array when no services enabled', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO users (id, username, password, plex_token)
        VALUES (1, 'testuser', 'hash', 'plex-token-123')
      `)

      const cookies = await getSsoCookies(1)
      expect(cookies.length).toBe(0)
    })

    it('should return cookie for plex when enabled', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO users (id, username, password, plex_token)
        VALUES (1, 'testuser', 'hash', 'plex-token-123')
      `)

      await setSetting('sso_enabled', '1')
      await setSetting('sso_plex_enabled', '1')

      const cookies = await getSsoCookies(1)
      expect(cookies.length).toBe(1)
      expect(cookies[0].name).toBe('X-Plex-Token')
      expect(cookies[0].value).toBe('plex-token-123')
      expect(cookies[0].path).toBe('/')
      expect(cookies[0].httpOnly).toBe(true)
      expect(cookies[0].secure).toBe(true)
      expect(cookies[0].sameSite).toBe('Lax')
    })

    it('should not return cookie when token is missing', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO users (id, username, password, plex_token)
        VALUES (1, 'testuser', 'hash', NULL)
      `)

      await setSetting('sso_enabled', '1')
      await setSetting('sso_plex_enabled', '1')

      const cookies = await getSsoCookies(1)
      expect(cookies.length).toBe(0)
    })

    it('should return cookies for multiple services', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO users (id, username, password, plex_token)
        VALUES (1, 'testuser', 'hash', 'plex-token-123')
      `)

      await setSetting('sso_enabled', '1')
      await setSetting('sso_plex_enabled', '1')
      await setSetting('sso_jellyfin_enabled', '1')
      await setSetting('sso_jellyfin_token', 'jellyfin-token-456')

      const cookies = await getSsoCookies(1)
      expect(cookies.length).toBe(2)

      const plexCookie = cookies.find((c) => c.name === 'X-Plex-Token')
      const jellyfinCookie = cookies.find((c) => c.name === 'jellyfin_credentials')

      expect(plexCookie?.value).toBe('plex-token-123')
      expect(jellyfinCookie?.value).toBe('jellyfin-token-456')
    })
  })

  // -------------------------------------------------------------------------
  // Set-Cookie header builders
  // -------------------------------------------------------------------------

  describe('buildSetCookieHeaders', () => {
    it('should build valid Set-Cookie headers', async () => {
      await setupDb()

      const cookies = [
        {
          name: 'test_cookie',
          value: 'test_value',
          domain: '.example.com',
          path: '/test',
          httpOnly: true,
          secure: true,
          sameSite: 'Lax' as const,
          maxAge: 3600,
        },
      ]

      const headers = buildSetCookieHeaders(cookies)
      expect(headers.length).toBe(1)
      expect(headers[0]).toContain('test_cookie=test_value')
      expect(headers[0]).toContain('Path=/test')
      expect(headers[0]).toContain('Domain=.example.com')
      expect(headers[0]).toContain('Max-Age=3600')
      expect(headers[0]).toContain('HttpOnly')
      expect(headers[0]).toContain('Secure')
      expect(headers[0]).toContain('SameSite=Lax')
    })

    it('should encode cookie values', async () => {
      await setupDb()

      const cookies = [
        {
          name: 'test',
          value: 'value with spaces',
          domain: '',
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'Lax' as const,
          maxAge: 3600,
        },
      ]

      const headers = buildSetCookieHeaders(cookies)
      expect(headers[0]).toContain('test=value%20with%20spaces')
    })

    it('should omit domain if empty', async () => {
      await setupDb()

      const cookies = [
        {
          name: 'test',
          value: 'value',
          domain: '',
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'Lax' as const,
          maxAge: 3600,
        },
      ]

      const headers = buildSetCookieHeaders(cookies)
      expect(headers[0]).not.toContain('Domain=')
    })
  })

  describe('buildClearCookieHeaders', () => {
    it('should build cookie clear headers with Max-Age=0', async () => {
      await setupDb()
      await setSetting('sso_enabled', '1')
      await setSetting('sso_plex_enabled', '1')

      const headers = await buildClearCookieHeaders()
      expect(headers.length).toBe(1)
      expect(headers[0]).toContain('X-Plex-Token=')
      expect(headers[0]).toContain('Max-Age=0')
      expect(headers[0]).toContain('Path=/')
    })

    it('should clear cookies for all enabled services', async () => {
      await setupDb()
      await setSetting('sso_enabled', '1')
      await setSetting('sso_plex_enabled', '1')
      await setSetting('sso_jellyfin_enabled', '1')

      const headers = await buildClearCookieHeaders()
      expect(headers.length).toBe(2)
      expect(headers.some((h) => h.includes('X-Plex-Token='))).toBe(true)
      expect(headers.some((h) => h.includes('jellyfin_credentials='))).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // Response helpers
  // -------------------------------------------------------------------------

  describe('appendSsoCookies', () => {
    it('should append Set-Cookie headers to response', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO users (id, username, password, plex_token)
        VALUES (1, 'testuser', 'hash', 'plex-token-123')
      `)

      await setSetting('sso_enabled', '1')
      await setSetting('sso_plex_enabled', '1')

      const headers = new Headers()
      await appendSsoCookies(1, headers)

      const setCookieHeaders = headers.getSetCookie()
      expect(setCookieHeaders.length).toBe(1)
      expect(setCookieHeaders[0]).toContain('X-Plex-Token=plex-token-123')
    })
  })

  describe('appendClearSsoCookies', () => {
    it('should append clear cookie headers to response', async () => {
      await setupDb()
      await setSetting('sso_enabled', '1')
      await setSetting('sso_plex_enabled', '1')

      const headers = new Headers()
      await appendClearSsoCookies(headers)

      const setCookieHeaders = headers.getSetCookie()
      expect(setCookieHeaders.length).toBe(1)
      expect(setCookieHeaders[0]).toContain('X-Plex-Token=')
      expect(setCookieHeaders[0]).toContain('Max-Age=0')
    })
  })
})
