import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import {
  escapeLdapFilter,
  mapLdapGroupToOrganizr,
  findOrCreateLdapUser,
  testLdapConnection,
  authenticateLdap,
  isLdapEnabled,
  loadLdapConfig,
  LDAP_DEFAULT_SETTINGS,
  type LdapConfig,
  type LdapUserInfo,
} from './auth-ldap'
import { _clearSettingsCache } from './settings'

// ---------------------------------------------------------------------------
// Mock ldapts Client
// ---------------------------------------------------------------------------

let mockBind: ReturnType<typeof mock>
let mockSearch: ReturnType<typeof mock>
let mockUnbind: ReturnType<typeof mock>
let mockStartTLS: ReturnType<typeof mock>

mock.module('ldapts', () => {
  mockBind = mock(() => Promise.resolve())
  mockSearch = mock(() =>
    Promise.resolve({
      searchEntries: [{ dn: 'cn=test,dc=example,dc=com' }],
      searchReferences: [],
    }),
  )
  mockUnbind = mock(() => Promise.resolve())
  mockStartTLS = mock(() => Promise.resolve())

  return {
    Client: class MockClient {
      bind = mockBind
      search = mockSearch
      unbind = mockUnbind
      startTLS = mockStartTLS
    },
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniqueDbPath(suffix = 'ldap'): string {
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

  return db
}

function createTestConfig(overrides?: Partial<LdapConfig>): LdapConfig {
  return {
    host: 'ldap.example.com',
    port: 389,
    baseDn: 'dc=example,dc=com',
    bindUsername: 'cn=admin,dc=example,dc=com',
    bindPassword: 'adminpass',
    ldapType: 'ad',
    ssl: false,
    tls: false,
    searchFilter: '',
    groupMapping: {},
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('auth-ldap service', () => {
  beforeEach(async () => {
    await closeDb()
    _clearSettingsCache()
  })

  afterEach(async () => {
    await closeDb()
    _clearSettingsCache()
  })

  // -------------------------------------------------------------------------
  // LDAP filter escaping
  // -------------------------------------------------------------------------

  describe('escapeLdapFilter', () => {
    it('should escape backslash', () => {
      expect(escapeLdapFilter('user\\name')).toBe('user\\5cname')
    })

    it('should escape asterisk', () => {
      expect(escapeLdapFilter('user*name')).toBe('user\\2aname')
    })

    it('should escape parentheses', () => {
      expect(escapeLdapFilter('user(name)')).toBe('user\\28name\\29')
    })

    it('should escape null byte', () => {
      expect(escapeLdapFilter('user\0name')).toBe('user\\00name')
    })

    it('should pass through normal characters', () => {
      expect(escapeLdapFilter('john.doe')).toBe('john.doe')
    })

    it('should handle empty string', () => {
      expect(escapeLdapFilter('')).toBe('')
    })

    it('should escape multiple special characters', () => {
      expect(escapeLdapFilter('a*b(c)d\\e')).toBe('a\\2ab\\28c\\29d\\5ce')
    })
  })

  // -------------------------------------------------------------------------
  // Group mapping
  // -------------------------------------------------------------------------

  describe('mapLdapGroupToOrganizr', () => {
    it('should return default group (999) when no mapping provided', () => {
      const result = mapLdapGroupToOrganizr(
        ['CN=Users,DC=example,DC=com'],
        {},
      )
      expect(result).toBe(999)
    })

    it('should map LDAP group to OrganizrX group_id', () => {
      const mapping = {
        'Admins': 0,
        'Users': 4,
      }
      const result = mapLdapGroupToOrganizr(
        ['CN=Admins,OU=Groups,DC=example,DC=com'],
        mapping,
      )
      expect(result).toBe(0)
    })

    it('should pick the lowest (most privileged) group_id', () => {
      const mapping = {
        'Admins': 0,
        'PowerUsers': 3,
        'Users': 4,
      }
      const result = mapLdapGroupToOrganizr(
        [
          'CN=Users,OU=Groups,DC=example,DC=com',
          'CN=Admins,OU=Groups,DC=example,DC=com',
        ],
        mapping,
      )
      expect(result).toBe(0)
    })

    it('should match case-insensitively', () => {
      const mapping = { 'admins': 0 }
      const result = mapLdapGroupToOrganizr(
        ['CN=Admins,OU=Groups,DC=example,DC=com'],
        mapping,
      )
      expect(result).toBe(0)
    })

    it('should return default when no groups match', () => {
      const mapping = { 'SuperAdmins': 0 }
      const result = mapLdapGroupToOrganizr(
        ['CN=Users,DC=example,DC=com'],
        mapping,
      )
      expect(result).toBe(999)
    })

    it('should handle empty LDAP groups array', () => {
      const mapping = { 'Admins': 0 }
      const result = mapLdapGroupToOrganizr([], mapping)
      expect(result).toBe(999)
    })
  })

  // -------------------------------------------------------------------------
  // Default settings
  // -------------------------------------------------------------------------

  describe('LDAP_DEFAULT_SETTINGS', () => {
    it('should contain all required setting keys', () => {
      const requiredKeys = [
        'ldap_enabled',
        'ldap_host',
        'ldap_port',
        'ldap_base_dn',
        'ldap_bind_username',
        'ldap_bind_password',
        'ldap_type',
        'ldap_ssl',
        'ldap_tls',
        'ldap_search_filter',
        'ldap_group_mapping',
      ]
      for (const key of requiredKeys) {
        expect(key in LDAP_DEFAULT_SETTINGS).toBe(true)
      }
    })

    it('should default ldap_enabled to false', () => {
      expect(LDAP_DEFAULT_SETTINGS.ldap_enabled).toBe('false')
    })

    it('should default ldap_port to 389', () => {
      expect(LDAP_DEFAULT_SETTINGS.ldap_port).toBe('389')
    })

    it('should default ldap_type to ad', () => {
      expect(LDAP_DEFAULT_SETTINGS.ldap_type).toBe('ad')
    })
  })

  // -------------------------------------------------------------------------
  // testLdapConnection
  // -------------------------------------------------------------------------

  describe('testLdapConnection', () => {
    it('should return success when connection works', async () => {
      const config = createTestConfig()

      mockBind.mockImplementation(() => Promise.resolve())
      mockSearch.mockImplementation(() =>
        Promise.resolve({
          searchEntries: [{ dn: 'dc=example,dc=com' }],
          searchReferences: [],
        }),
      )
      mockUnbind.mockImplementation(() => Promise.resolve())

      const result = await testLdapConnection(config)
      expect(result.success).toBe(true)
      expect(result.message).toContain('Connection successful')
    })

    it('should return failure when bind fails', async () => {
      const config = createTestConfig()

      mockBind.mockImplementation(() => Promise.reject(new Error('Bind failed: Invalid credentials')))

      const result = await testLdapConnection(config)
      expect(result.success).toBe(false)
      expect(result.message).toContain('LDAP connection failed')
    })

    it('should return failure when base DN search returns empty', async () => {
      const config = createTestConfig()

      mockBind.mockImplementation(() => Promise.resolve())
      mockSearch.mockImplementation(() =>
        Promise.resolve({
          searchEntries: [],
          searchReferences: [],
        }),
      )
      mockUnbind.mockImplementation(() => Promise.resolve())

      const result = await testLdapConnection(config)
      expect(result.success).toBe(false)
      expect(result.message).toContain('returned no results')
    })

    it('should use startTLS when tls=true and ssl=false', async () => {
      const config = createTestConfig({ tls: true, ssl: false })

      mockBind.mockImplementation(() => Promise.resolve())
      mockStartTLS.mockImplementation(() => Promise.resolve())
      mockSearch.mockImplementation(() =>
        Promise.resolve({
          searchEntries: [{ dn: 'dc=example,dc=com' }],
          searchReferences: [],
        }),
      )
      mockUnbind.mockImplementation(() => Promise.resolve())

      const result = await testLdapConnection(config)
      expect(result.success).toBe(true)
      expect(mockStartTLS).toHaveBeenCalled()
    })

    it('should support anonymous bind when no bindUsername provided', async () => {
      const config = createTestConfig({ bindUsername: '', bindPassword: '' })

      mockBind.mockImplementation(() => Promise.resolve())
      mockSearch.mockImplementation(() =>
        Promise.resolve({
          searchEntries: [{ dn: 'dc=example,dc=com' }],
          searchReferences: [],
        }),
      )
      mockUnbind.mockImplementation(() => Promise.resolve())

      const result = await testLdapConnection(config)
      expect(result.success).toBe(true)
      // Verify bind was called with empty strings (anonymous)
      expect(mockBind).toHaveBeenCalledWith('', '')
    })
  })

  // -------------------------------------------------------------------------
  // authenticateLdap
  // -------------------------------------------------------------------------

  describe('authenticateLdap', () => {
    it('should authenticate and return user info for AD', async () => {
      const config = createTestConfig({ ldapType: 'ad' })
      let bindCallCount = 0

      mockBind.mockImplementation(() => {
        bindCallCount++
        return Promise.resolve()
      })
      mockSearch.mockImplementation(() =>
        Promise.resolve({
          searchEntries: [{
            dn: 'CN=John Doe,OU=Users,DC=example,DC=com',
            sAMAccountName: 'jdoe',
            mail: 'jdoe@example.com',
            displayName: 'John Doe',
            memberOf: [
              'CN=Admins,OU=Groups,DC=example,DC=com',
              'CN=Users,OU=Groups,DC=example,DC=com',
            ],
          }],
          searchReferences: [],
        }),
      )
      mockUnbind.mockImplementation(() => Promise.resolve())

      const result = await authenticateLdap('jdoe', 'password123', config)

      expect(result).not.toBeNull()
      expect(result!.username).toBe('jdoe')
      expect(result!.email).toBe('jdoe@example.com')
      expect(result!.displayName).toBe('John Doe')
      expect(result!.groups).toHaveLength(2)
    })

    it('should return null when user not found', async () => {
      const config = createTestConfig()

      mockBind.mockImplementation(() => Promise.resolve())
      mockSearch.mockImplementation(() =>
        Promise.resolve({
          searchEntries: [],
          searchReferences: [],
        }),
      )
      mockUnbind.mockImplementation(() => Promise.resolve())

      const result = await authenticateLdap('nonexistent', 'password', config)
      expect(result).toBeNull()
    })

    it('should return null when user bind fails (wrong password)', async () => {
      const config = createTestConfig()
      let bindCallCount = 0

      mockBind.mockImplementation(() => {
        bindCallCount++
        // First bind (service account) succeeds, second (user) fails
        if (bindCallCount === 2) {
          return Promise.reject(new Error('Invalid credentials'))
        }
        return Promise.resolve()
      })
      mockSearch.mockImplementation(() =>
        Promise.resolve({
          searchEntries: [{
            dn: 'CN=John,DC=example,DC=com',
            sAMAccountName: 'john',
            mail: 'john@example.com',
          }],
          searchReferences: [],
        }),
      )
      mockUnbind.mockImplementation(() => Promise.resolve())

      const result = await authenticateLdap('john', 'wrongpassword', config)
      expect(result).toBeNull()
    })

    it('should use uid for OpenLDAP user entries', async () => {
      const config = createTestConfig({ ldapType: 'openldap' })

      mockBind.mockImplementation(() => Promise.resolve())
      mockSearch.mockImplementation(() =>
        Promise.resolve({
          searchEntries: [{
            dn: 'uid=jdoe,ou=People,dc=example,dc=com',
            uid: 'jdoe',
            mail: 'jdoe@example.com',
            cn: 'John Doe',
            memberOf: [],
          }],
          searchReferences: [],
        }),
      )
      mockUnbind.mockImplementation(() => Promise.resolve())

      const result = await authenticateLdap('jdoe', 'password', config)

      expect(result).not.toBeNull()
      expect(result!.username).toBe('jdoe')
    })

    it('should use custom search filter when provided', async () => {
      const config = createTestConfig({
        searchFilter: '(&(objectClass=user)(mail={username}@example.com))',
      })

      mockBind.mockImplementation(() => Promise.resolve())
      mockSearch.mockImplementation((_baseDn: string, opts: { filter: string }) => {
        // Verify the custom filter was applied with username substituted
        expect(opts.filter).toBe('(&(objectClass=user)(mail=jdoe@example.com))')
        return Promise.resolve({
          searchEntries: [{
            dn: 'CN=jdoe,DC=example,DC=com',
            sAMAccountName: 'jdoe',
            mail: 'jdoe@example.com',
          }],
          searchReferences: [],
        })
      })
      mockUnbind.mockImplementation(() => Promise.resolve())

      const result = await authenticateLdap('jdoe', 'password', config)
      expect(result).not.toBeNull()
    })

    it('should throw on service account bind failure', async () => {
      const config = createTestConfig()

      mockBind.mockImplementation(() =>
        Promise.reject(new Error('Connection refused')),
      )
      mockUnbind.mockImplementation(() => Promise.resolve())

      expect(authenticateLdap('jdoe', 'pass', config)).rejects.toThrow(
        'LDAP authentication error',
      )
    })
  })

  // -------------------------------------------------------------------------
  // findOrCreateLdapUser
  // -------------------------------------------------------------------------

  describe('findOrCreateLdapUser', () => {
    it('should create a new user when none exists', async () => {
      await setupDb()

      const ldapUser: LdapUserInfo = {
        username: 'ldapuser',
        email: 'ldap@example.com',
        displayName: 'LDAP User',
        groups: [],
      }

      const result = await findOrCreateLdapUser(ldapUser, 4)

      expect(result.username).toBe('ldapuser')
      expect(result.email).toBe('ldap@example.com')
      expect(result.group_id).toBe(4)
      expect(result.groupName).toBe('User')
    })

    it('should return existing user when already created', async () => {
      await setupDb()

      const ldapUser: LdapUserInfo = {
        username: 'existinguser',
        email: 'existing@example.com',
        displayName: 'Existing',
        groups: [],
      }

      // Create first time
      const first = await findOrCreateLdapUser(ldapUser, 4)
      // Second call should return same user
      const second = await findOrCreateLdapUser(ldapUser, 0) // Different group - should not matter
      expect(second.id).toBe(first.id)
      expect(second.username).toBe('existinguser')
    })

    it('should set auth_service to ldap', async () => {
      const db = await setupDb()

      const ldapUser: LdapUserInfo = {
        username: 'ldapservice',
        email: null,
        displayName: null,
        groups: [],
      }

      await findOrCreateLdapUser(ldapUser, 999)

      // Verify auth_service column in DB
      const rows = db.$client.prepare(
        'SELECT auth_service FROM users WHERE username = ?',
      ).all('ldapservice') as Array<{ auth_service: string }>

      expect(rows).toHaveLength(1)
      expect(rows[0].auth_service).toBe('ldap')
    })

    it('should assign correct group name for admin group_id', async () => {
      await setupDb()

      const ldapUser: LdapUserInfo = {
        username: 'ldapadmin',
        email: 'admin@example.com',
        displayName: 'LDAP Admin',
        groups: [],
      }

      const result = await findOrCreateLdapUser(ldapUser, 0)
      expect(result.groupName).toBe('Admin')
      expect(result.group_id).toBe(0)
    })

    it('should handle null email gracefully', async () => {
      await setupDb()

      const ldapUser: LdapUserInfo = {
        username: 'noemail',
        email: null,
        displayName: null,
        groups: [],
      }

      const result = await findOrCreateLdapUser(ldapUser, 4)
      expect(result.username).toBe('noemail')
      expect(result.email).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // isLdapEnabled / loadLdapConfig
  // -------------------------------------------------------------------------

  describe('isLdapEnabled', () => {
    it('should return false by default', async () => {
      await setupDb()
      const enabled = await isLdapEnabled()
      expect(enabled).toBe(false)
    })
  })

  describe('loadLdapConfig', () => {
    it('should return defaults when no settings exist', async () => {
      await setupDb()
      const config = await loadLdapConfig()

      expect(config.host).toBe('')
      expect(config.port).toBe(389)
      expect(config.baseDn).toBe('')
      expect(config.ldapType).toBe('ad')
      expect(config.ssl).toBe(false)
      expect(config.tls).toBe(false)
    })
  })
})
