import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import {
  mapOidcGroupsToOrganizr,
  extractOidcUserInfo,
  storeOidcState,
  retrieveAndDeleteOidcState,
  findOrCreateOidcUser,
  linkOidcAccount,
  getGroupNameById,
  _resetOidcStateStore,
  type OidcAuthState,
  type OidcUserInfo,
} from './auth-oidc'

function uniqueDbPath(suffix = 'oidc'): string {
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

describe('auth-oidc service', () => {
  beforeEach(async () => {
    await closeDb()
    _resetOidcStateStore()
  })

  afterEach(async () => {
    await closeDb()
    _resetOidcStateStore()
  })

  // -------------------------------------------------------------------------
  // PKCE/State store
  // -------------------------------------------------------------------------

  describe('OIDC state store', () => {
    it('should store and retrieve state', () => {
      const state: OidcAuthState = {
        codeVerifier: 'test-verifier-123',
        state: 'test-state-abc',
        nonce: 'test-nonce-xyz',
        createdAt: Date.now(),
      }

      storeOidcState('test-state-abc', state)
      const retrieved = retrieveAndDeleteOidcState('test-state-abc')

      expect(retrieved).not.toBeNull()
      expect(retrieved?.codeVerifier).toBe('test-verifier-123')
      expect(retrieved?.state).toBe('test-state-abc')
      expect(retrieved?.nonce).toBe('test-nonce-xyz')
    })

    it('should delete state after retrieval', () => {
      const state: OidcAuthState = {
        codeVerifier: 'verifier',
        state: 'state-once',
        nonce: 'nonce',
        createdAt: Date.now(),
      }

      storeOidcState('state-once', state)
      retrieveAndDeleteOidcState('state-once')
      const secondRetrieval = retrieveAndDeleteOidcState('state-once')

      expect(secondRetrieval).toBeNull()
    })

    it('should return null for non-existent state', () => {
      const result = retrieveAndDeleteOidcState('does-not-exist')
      expect(result).toBeNull()
    })

    it('should expire entries after TTL', () => {
      const state: OidcAuthState = {
        codeVerifier: 'verifier',
        state: 'expired-state',
        nonce: 'nonce',
        createdAt: Date.now() - 700_000, // 11+ minutes ago (TTL is 10 minutes)
      }

      storeOidcState('expired-state', state)

      // Storing a new state triggers cleanup of expired entries
      const newState: OidcAuthState = {
        codeVerifier: 'v2',
        state: 'fresh-state',
        nonce: 'n2',
        createdAt: Date.now(),
      }
      storeOidcState('fresh-state', newState)

      const result = retrieveAndDeleteOidcState('expired-state')
      expect(result).toBeNull()

      const fresh = retrieveAndDeleteOidcState('fresh-state')
      expect(fresh).not.toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // Group mapping
  // -------------------------------------------------------------------------

  describe('mapOidcGroupsToOrganizr', () => {
    it('should map groups with direct match', () => {
      const claims = { groups: ['admins', 'users'] }
      const mapping = { admins: 0, users: 4 }

      const result = mapOidcGroupsToOrganizr(claims, 'groups', mapping, 4)
      // Should return highest privilege (lowest number)
      expect(result).toBe(0)
    })

    it('should return default group when no groups match', () => {
      const claims = { groups: ['unknown-group'] }
      const mapping = { admins: 0 }

      const result = mapOidcGroupsToOrganizr(claims, 'groups', mapping, 4)
      expect(result).toBe(4)
    })

    it('should return default group when no groups claim exists', () => {
      const claims = { sub: 'user123' }
      const mapping = { admins: 0 }

      const result = mapOidcGroupsToOrganizr(claims, 'groups', mapping, 4)
      expect(result).toBe(4)
    })

    it('should handle Keycloak nested groups with leading slash', () => {
      const claims = { groups: ['/org/admins'] }
      const mapping = { admins: 0 }

      const result = mapOidcGroupsToOrganizr(claims, 'groups', mapping, 4)
      expect(result).toBe(0)
    })

    it('should handle Keycloak path-based groups (strip leading slash)', () => {
      const claims = { groups: ['/editors'] }
      const mapping = { editors: 2 }

      const result = mapOidcGroupsToOrganizr(claims, 'groups', mapping, 4)
      expect(result).toBe(2)
    })

    it('should handle Zitadel-style object keys', () => {
      const claims = {
        'urn:zitadel:iam:org:project:roles': {
          admin: { orgId: '123' },
          editor: { orgId: '123' },
        },
      }
      const mapping = { admin: 0, editor: 2 }

      const result = mapOidcGroupsToOrganizr(
        claims,
        'urn:zitadel:iam:org:project:roles',
        mapping,
        4,
      )
      expect(result).toBe(0)
    })

    it('should handle nested claim path', () => {
      const claims = {
        realm_access: {
          roles: ['admin', 'user'],
        },
      }
      const mapping = { admin: 0, user: 4 }

      const result = mapOidcGroupsToOrganizr(claims, 'realm_access.roles', mapping, 4)
      expect(result).toBe(0)
    })

    it('should handle string groups (single group)', () => {
      const claims = { groups: 'admin' }
      const mapping = { admin: 0 }

      const result = mapOidcGroupsToOrganizr(claims, 'groups', mapping, 4)
      expect(result).toBe(0)
    })

    it('should return lowest group_id (highest privilege) on multiple matches', () => {
      const claims = { groups: ['power-users', 'admins', 'viewers'] }
      const mapping = { 'power-users': 3, admins: 0, viewers: 4 }

      const result = mapOidcGroupsToOrganizr(claims, 'groups', mapping, 4)
      expect(result).toBe(0)
    })
  })

  // -------------------------------------------------------------------------
  // Extract user info from ID token claims
  // -------------------------------------------------------------------------

  describe('extractOidcUserInfo', () => {
    it('should extract standard OIDC claims', () => {
      const claims = {
        sub: 'user-123',
        email: 'user@example.com',
        preferred_username: 'johndoe',
        name: 'John Doe',
        picture: 'https://example.com/photo.jpg',
        groups: ['admin', 'users'],
      }

      const info = extractOidcUserInfo(claims, 'groups')

      expect(info.sub).toBe('user-123')
      expect(info.email).toBe('user@example.com')
      expect(info.preferredUsername).toBe('johndoe')
      expect(info.name).toBe('John Doe')
      expect(info.picture).toBe('https://example.com/photo.jpg')
      expect(info.groups).toEqual(['admin', 'users'])
    })

    it('should handle missing optional fields', () => {
      const claims = {
        sub: 'user-456',
      }

      const info = extractOidcUserInfo(claims, 'groups')

      expect(info.sub).toBe('user-456')
      expect(info.email).toBeNull()
      expect(info.preferredUsername).toBeNull()
      expect(info.name).toBeNull()
      expect(info.picture).toBeNull()
      expect(info.groups).toEqual([])
    })

    it('should handle non-string values gracefully', () => {
      const claims = {
        sub: 'user-789',
        email: 12345,
        preferred_username: null,
        name: undefined,
        picture: { url: 'nope' },
      }

      const info = extractOidcUserInfo(claims as Record<string, unknown>, 'groups')

      expect(info.sub).toBe('user-789')
      expect(info.email).toBeNull()
      expect(info.preferredUsername).toBeNull()
      expect(info.name).toBeNull()
      expect(info.picture).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // getGroupNameById
  // -------------------------------------------------------------------------

  describe('getGroupNameById', () => {
    it('should return known group names', () => {
      expect(getGroupNameById(0)).toBe('Admin')
      expect(getGroupNameById(1)).toBe('Co-Admin')
      expect(getGroupNameById(2)).toBe('Super User')
      expect(getGroupNameById(3)).toBe('Power User')
      expect(getGroupNameById(4)).toBe('User')
      expect(getGroupNameById(999)).toBe('Guest')
    })

    it('should return User for unknown group IDs', () => {
      expect(getGroupNameById(42)).toBe('User')
      expect(getGroupNameById(-1)).toBe('User')
    })
  })

  // -------------------------------------------------------------------------
  // findOrCreateOidcUser (DB integration)
  // -------------------------------------------------------------------------

  describe('findOrCreateOidcUser', () => {
    it('should create a new user when none exists', async () => {
      await setupDb()

      const oidcUser: OidcUserInfo = {
        sub: 'oidc-sub-123',
        email: 'newuser@example.com',
        preferredUsername: 'newuser',
        name: 'New User',
        picture: 'https://example.com/avatar.jpg',
        groups: ['users'],
      }

      const user = await findOrCreateOidcUser(oidcUser, 4, 'User', true)

      expect(user).not.toBeNull()
      expect(user?.username).toBe('newuser')
      expect(user?.email).toBe('newuser@example.com')
      expect(user?.group_id).toBe(4)
      expect(user?.group).toBe('User')
      expect(user?.image).toBe('https://example.com/avatar.jpg')
    })

    it('should find existing user by auth_service', async () => {
      const db = await setupDb()

      // Insert existing user with OIDC auth_service
      db.$client.exec(`
        INSERT INTO users (username, password, email, "group", group_id, auth_service, locked)
        VALUES ('existinguser', 'hash', 'existing@example.com', 'User', 4, 'oidc:existing-sub', 0)
      `)

      const oidcUser: OidcUserInfo = {
        sub: 'existing-sub',
        email: 'existing@example.com',
        preferredUsername: 'existinguser',
        name: 'Existing User',
        picture: null,
        groups: ['admins'],
      }

      const user = await findOrCreateOidcUser(oidcUser, 0, 'Admin', true)

      expect(user).not.toBeNull()
      expect(user?.id).toBe(1) // Same user, not a new one
      expect(user?.group_id).toBe(0)
      expect(user?.group).toBe('Admin')
    })

    it('should find existing user by email', async () => {
      const db = await setupDb()

      // Insert existing user with internal auth_service
      db.$client.exec(`
        INSERT INTO users (username, password, email, "group", group_id, auth_service, locked)
        VALUES ('localuser', 'hash', 'local@example.com', 'User', 4, 'internal', 0)
      `)

      const oidcUser: OidcUserInfo = {
        sub: 'new-oidc-sub',
        email: 'local@example.com',
        preferredUsername: 'localuser',
        name: 'Local User',
        picture: null,
        groups: [],
      }

      const user = await findOrCreateOidcUser(oidcUser, 4, 'User', true)

      expect(user).not.toBeNull()
      expect(user?.id).toBe(1)
    })

    it('should return null when auto-create is disabled and user does not exist', async () => {
      await setupDb()

      const oidcUser: OidcUserInfo = {
        sub: 'unknown-sub',
        email: 'unknown@example.com',
        preferredUsername: 'unknown',
        name: 'Unknown',
        picture: null,
        groups: [],
      }

      const user = await findOrCreateOidcUser(oidcUser, 4, 'User', false)
      expect(user).toBeNull()
    })

    it('should use sub as username when no preferred_username or name', async () => {
      await setupDb()

      const oidcUser: OidcUserInfo = {
        sub: 'sub-only-user',
        email: null,
        preferredUsername: null,
        name: null,
        picture: null,
        groups: [],
      }

      const user = await findOrCreateOidcUser(oidcUser, 4, 'User', true)

      expect(user).not.toBeNull()
      expect(user?.username).toBe('sub-only-user')
    })

    it('should use name when preferred_username is missing', async () => {
      await setupDb()

      const oidcUser: OidcUserInfo = {
        sub: 'sub-name-user',
        email: 'name@example.com',
        preferredUsername: null,
        name: 'Display Name',
        picture: null,
        groups: [],
      }

      const user = await findOrCreateOidcUser(oidcUser, 4, 'User', true)

      expect(user).not.toBeNull()
      expect(user?.username).toBe('Display Name')
    })
  })

  // -------------------------------------------------------------------------
  // linkOidcAccount (DB integration)
  // -------------------------------------------------------------------------

  describe('linkOidcAccount', () => {
    it('should update auth_service for an existing user', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO users (username, password, email, "group", group_id, auth_service, locked)
        VALUES ('linkuser', 'hash', 'link@example.com', 'User', 4, 'internal', 0)
      `)

      await linkOidcAccount(1, 'linked-oidc-sub')

      const rows = db.$client.prepare('SELECT auth_service FROM users WHERE id = 1').all()
      const row = rows[0] as { auth_service: string }
      expect(row.auth_service).toBe('oidc:linked-oidc-sub')
    })
  })
})
