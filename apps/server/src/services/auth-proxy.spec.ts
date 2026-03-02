import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import {
  parseCIDR,
  ipInRange,
  isTrustedProxy,
  extractProxyUser,
  findOrCreateProxyUser,
  authenticateProxyUser,
  getProxyAuthConfig,
  isProxyAuthEnabled,
} from './auth-proxy'
import { setSetting, _clearSettingsCache } from './settings'

function uniqueDbPath(suffix = 'auth-proxy'): string {
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
      totp_backup_codes TEXT,
      totp_enabled INTEGER DEFAULT 0
    )
  `)

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      value TEXT
    )
  `)
}

describe('auth-proxy service', () => {
  beforeEach(async () => {
    await setupDb()
    _clearSettingsCache()
  })

  afterEach(async () => {
    await closeDb()
  })

  describe('parseCIDR', () => {
    it('should parse IPv4 CIDR notation', () => {
      const cidr = parseCIDR('192.168.1.0/24')
      expect(cidr).not.toBeNull()
      expect(cidr?.version).toBe(4)
    })

    it('should parse IPv4 single IP', () => {
      const cidr = parseCIDR('192.168.1.1')
      expect(cidr).not.toBeNull()
      expect(cidr?.version).toBe(4)
    })

    it('should parse IPv6 CIDR notation', () => {
      const cidr = parseCIDR('2001:db8::/32')
      expect(cidr).not.toBeNull()
      expect(cidr?.version).toBe(6)
    })

    it('should parse IPv6 single IP', () => {
      const cidr = parseCIDR('2001:db8::1')
      expect(cidr).not.toBeNull()
      expect(cidr?.version).toBe(6)
    })

    it('should handle :: notation', () => {
      const cidr = parseCIDR('::1')
      expect(cidr).not.toBeNull()
      expect(cidr?.version).toBe(6)
    })

    it('should return null for invalid IP', () => {
      expect(parseCIDR('999.999.999.999')).toBeNull()
      expect(parseCIDR('invalid')).toBeNull()
    })
  })

  describe('ipInRange', () => {
    it('should match IPv4 in CIDR range', () => {
      const cidr = parseCIDR('192.168.1.0/24')
      expect(cidr).not.toBeNull()
      expect(ipInRange('192.168.1.1', cidr!)).toBe(true)
      expect(ipInRange('192.168.1.255', cidr!)).toBe(true)
      expect(ipInRange('192.168.2.1', cidr!)).toBe(false)
    })

    it('should match IPv4 exact IP', () => {
      const cidr = parseCIDR('192.168.1.1/32')
      expect(cidr).not.toBeNull()
      expect(ipInRange('192.168.1.1', cidr!)).toBe(true)
      expect(ipInRange('192.168.1.2', cidr!)).toBe(false)
    })

    it('should match IPv6 in CIDR range', () => {
      const cidr = parseCIDR('2001:db8::/32')
      expect(cidr).not.toBeNull()
      expect(ipInRange('2001:db8::1', cidr!)).toBe(true)
      expect(ipInRange('2001:db8:ffff:ffff:ffff:ffff:ffff:ffff', cidr!)).toBe(true)
      expect(ipInRange('2001:db9::1', cidr!)).toBe(false)
    })

    it('should match IPv6 localhost', () => {
      const cidr = parseCIDR('::1/128')
      expect(cidr).not.toBeNull()
      expect(ipInRange('::1', cidr!)).toBe(true)
      expect(ipInRange('::2', cidr!)).toBe(false)
    })
  })

  describe('isTrustedProxy', () => {
    it('should trust exact IP match', () => {
      expect(isTrustedProxy('127.0.0.1', ['127.0.0.1', '192.168.1.1'])).toBe(true)
      expect(isTrustedProxy('192.168.1.1', ['127.0.0.1', '192.168.1.1'])).toBe(true)
      expect(isTrustedProxy('10.0.0.1', ['127.0.0.1', '192.168.1.1'])).toBe(false)
    })

    it('should trust CIDR range match', () => {
      expect(isTrustedProxy('192.168.1.50', ['192.168.1.0/24'])).toBe(true)
      expect(isTrustedProxy('192.168.2.50', ['192.168.1.0/24'])).toBe(false)
    })

    it('should trust IPv6', () => {
      expect(isTrustedProxy('::1', ['::1'])).toBe(true)
      expect(isTrustedProxy('2001:db8::1', ['2001:db8::/32'])).toBe(true)
      expect(isTrustedProxy('2001:db9::1', ['2001:db8::/32'])).toBe(false)
    })

    it('should reject untrusted IPs', () => {
      expect(isTrustedProxy('1.2.3.4', ['127.0.0.1', '192.168.0.0/16'])).toBe(false)
    })
  })

  describe('extractProxyUser', () => {
    it('should extract username from configured header', () => {
      const headers = {
        'x-forwarded-user': 'testuser',
        'x-forwarded-email': 'test@example.com',
      }
      const config = {
        enabled: true,
        headerUser: 'X-Forwarded-User',
        headerEmail: 'X-Forwarded-Email',
        headerGroups: 'X-Forwarded-Groups',
        whitelist: ['127.0.0.1'],
        defaultGroupId: 4,
        autoCreate: true,
      }

      const result = extractProxyUser(headers, config)
      expect(result.username).toBe('testuser')
      expect(result.email).toBe('test@example.com')
    })

    it('should handle missing headers', () => {
      const headers = {}
      const config = {
        enabled: true,
        headerUser: 'X-Forwarded-User',
        headerEmail: 'X-Forwarded-Email',
        headerGroups: 'X-Forwarded-Groups',
        whitelist: ['127.0.0.1'],
        defaultGroupId: 4,
        autoCreate: true,
      }

      const result = extractProxyUser(headers, config)
      expect(result.username).toBeNull()
      expect(result.email).toBeNull()
    })

    it('should parse groups from comma-separated header', () => {
      const headers = {
        'x-forwarded-groups': 'admin,user,developer',
      }
      const config = {
        enabled: true,
        headerUser: 'X-Forwarded-User',
        headerEmail: 'X-Forwarded-Email',
        headerGroups: 'X-Forwarded-Groups',
        whitelist: ['127.0.0.1'],
        defaultGroupId: 4,
        autoCreate: true,
      }

      const result = extractProxyUser(headers, config)
      expect(result.groups).toEqual(['admin', 'user', 'developer'])
    })
  })

  describe('findOrCreateProxyUser', () => {
    it('should create new proxy user with auth_service=proxy', async () => {
      const user = await findOrCreateProxyUser({
        username: 'proxyuser',
        email: 'proxy@example.com',
        groupId: 4,
      })

      expect(user.username).toBe('proxyuser')
      expect(user.email).toBe('proxy@example.com')
      expect(user.group_id).toBe(4)
      expect(user.id).toBeGreaterThan(0)

      const db = getRawDb() as SqliteDb
      const rows = db.$client.query('SELECT auth_service FROM users WHERE username = ?').all('proxyuser')
      expect(rows.length).toBe(1)
      expect((rows[0] as { auth_service: string }).auth_service).toBe('proxy')
    })

    it('should return existing user if already exists', async () => {
      const user1 = await findOrCreateProxyUser({
        username: 'existing',
        email: 'existing@example.com',
        groupId: 4,
      })

      const user2 = await findOrCreateProxyUser({
        username: 'existing',
        email: 'different@example.com',
        groupId: 3,
      })

      expect(user1.id).toBe(user2.id)
      expect(user1.username).toBe(user2.username)
      expect(user1.email).toBe(user2.email)
    })
  })

  describe('authenticateProxyUser', () => {
    it('should authenticate from trusted IP with valid username', async () => {
      await setSetting('auth_proxy_enabled', 'true')
      await setSetting('auth_proxy_header_user', 'X-Forwarded-User')
      await setSetting('auth_proxy_whitelist', '127.0.0.1,192.168.1.0/24')
      await setSetting('auth_proxy_default_group_id', '4')
      await setSetting('auth_proxy_auto_create', 'true')

      const result = await authenticateProxyUser('127.0.0.1', {
        'x-forwarded-user': 'testuser',
        'x-forwarded-email': 'test@example.com',
      })

      expect(result).not.toBeNull()
      expect(result?.token).toBeDefined()
      expect(typeof result?.token).toBe('string')
    })

    it('should reject from untrusted IP', async () => {
      await setSetting('auth_proxy_enabled', 'true')
      await setSetting('auth_proxy_header_user', 'X-Forwarded-User')
      await setSetting('auth_proxy_whitelist', '192.168.1.0/24')

      const result = await authenticateProxyUser('10.0.0.1', {
        'x-forwarded-user': 'testuser',
      })

      expect(result).toBeNull()
    })

    it('should reject when proxy auth is disabled', async () => {
      await setSetting('auth_proxy_enabled', 'false')

      const result = await authenticateProxyUser('127.0.0.1', {
        'x-forwarded-user': 'testuser',
      })

      expect(result).toBeNull()
    })

    it('should reject when username header is missing', async () => {
      await setSetting('auth_proxy_enabled', 'true')
      await setSetting('auth_proxy_whitelist', '127.0.0.1')

      const result = await authenticateProxyUser('127.0.0.1', {})

      expect(result).toBeNull()
    })

    it('should reject non-existent user when auto_create is false', async () => {
      await setSetting('auth_proxy_enabled', 'true')
      await setSetting('auth_proxy_header_user', 'X-Forwarded-User')
      await setSetting('auth_proxy_whitelist', '127.0.0.1')
      await setSetting('auth_proxy_auto_create', 'false')

      const result = await authenticateProxyUser('127.0.0.1', {
        'x-forwarded-user': 'nonexistent',
      })

      expect(result).toBeNull()
    })
  })

  describe('getProxyAuthConfig', () => {
    it('should return default config when settings are missing', async () => {
      const config = await getProxyAuthConfig()

      expect(config.enabled).toBe(false)
      expect(config.headerUser).toBe('X-Forwarded-User')
      expect(config.headerEmail).toBe('X-Forwarded-Email')
      expect(config.headerGroups).toBe('X-Forwarded-Groups')
      expect(config.whitelist).toEqual(['127.0.0.1', '::1'])
      expect(config.defaultGroupId).toBe(4)
      expect(config.autoCreate).toBe(true)
    })

    it('should parse settings correctly', async () => {
      await setSetting('auth_proxy_enabled', 'true')
      await setSetting('auth_proxy_header_user', 'Remote-User')
      await setSetting('auth_proxy_header_email', 'Remote-Email')
      await setSetting('auth_proxy_whitelist', '192.168.1.1,10.0.0.0/8')
      await setSetting('auth_proxy_default_group_id', '3')
      await setSetting('auth_proxy_auto_create', 'false')

      const config = await getProxyAuthConfig()

      expect(config.enabled).toBe(true)
      expect(config.headerUser).toBe('Remote-User')
      expect(config.headerEmail).toBe('Remote-Email')
      expect(config.whitelist).toEqual(['192.168.1.1', '10.0.0.0/8'])
      expect(config.defaultGroupId).toBe(3)
      expect(config.autoCreate).toBe(false)
    })
  })

  describe('isProxyAuthEnabled', () => {
    it('should return false by default', async () => {
      const enabled = await isProxyAuthEnabled()
      expect(enabled).toBe(false)
    })

    it('should return true when enabled', async () => {
      await setSetting('auth_proxy_enabled', 'true')
      const enabled = await isProxyAuthEnabled()
      expect(enabled).toBe(true)
    })
  })
})
