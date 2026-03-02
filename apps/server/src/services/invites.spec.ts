import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import {
  generateInviteCode,
  createInvite,
  getInvites,
  getInviteByCode,
  verifyInvite,
  redeemInvite,
  revokeInvite,
} from './invites'
import { setSetting, _clearSettingsCache } from './settings'

function uniqueDbPath(suffix = 'invites'): string {
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
    CREATE TABLE IF NOT EXISTS invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      date TEXT,
      email TEXT,
      username TEXT,
      dateused TEXT,
      usedby TEXT,
      ip TEXT,
      valid TEXT,
      type TEXT,
      invitedby TEXT
    )
  `)

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      value TEXT
    )
  `)

  // Enable invites by default for tests
  await setSetting('invites_enabled', 'true')
  await setSetting('invites_expiry_days', '7')
  await setSetting('invites_max_per_user', '0')
  await setSetting('invites_default_group_id', '4')
  await setSetting('invites_allow_user_delete', 'false')

  return db
}

describe('invites service', () => {
  beforeEach(async () => {
    await closeDb()
    _clearSettingsCache()
  })

  afterEach(async () => {
    await closeDb()
    _clearSettingsCache()
  })

  // ---------------------------------------------------------------------------
  // Invite code generation
  // ---------------------------------------------------------------------------

  describe('generateInviteCode', () => {
    it('should generate a valid UUID v4 code', () => {
      const code = generateInviteCode()
      expect(code).toBeDefined()
      expect(code.length).toBe(36)
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(code).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    })

    it('should generate unique codes', () => {
      const code1 = generateInviteCode()
      const code2 = generateInviteCode()
      expect(code1).not.toBe(code2)
    })
  })

  // ---------------------------------------------------------------------------
  // Create invite
  // ---------------------------------------------------------------------------

  describe('createInvite', () => {
    it('should create an invite with a generated code', async () => {
      await setupDb()

      const result = await createInvite({
        invitedby: '1',
        type: 'user',
      })

      expect(result.id).toBeGreaterThan(0)
      expect(result.code).toBeDefined()
      expect(result.code.length).toBe(36)
    })

    it('should create an invite with email restriction', async () => {
      await setupDb()

      const result = await createInvite({
        email: 'test@example.com',
        invitedby: '1',
        type: 'user',
      })

      expect(result.id).toBeGreaterThan(0)

      const invite = await getInviteByCode(result.code)
      expect(invite).not.toBeNull()
      expect(invite?.email).toBe('test@example.com')
    })

    it('should throw error when invites are disabled', async () => {
      await setupDb()
      await setSetting('invites_enabled', 'false')

      await expect(
        createInvite({
          invitedby: '1',
          type: 'user',
        })
      ).rejects.toThrow('Invites are currently disabled')
    })

    it('should enforce per-user maximum limit', async () => {
      await setupDb()
      await setSetting('invites_max_per_user', '2')

      // Create first invite
      await createInvite({
        invitedby: '1',
        type: 'user',
      })

      // Create second invite
      await createInvite({
        invitedby: '1',
        type: 'user',
      })

      // Third should fail
      await expect(
        createInvite({
          invitedby: '1',
          type: 'user',
        })
      ).rejects.toThrow('Maximum invite limit reached')
    })
  })

  // ---------------------------------------------------------------------------
  // Get invites
  // ---------------------------------------------------------------------------

  describe('getInvites', () => {
    it('should return all invites for admin', async () => {
      await setupDb()

      await createInvite({ invitedby: '1', type: 'user' })
      await createInvite({ invitedby: '2', type: 'user' })

      const invites = await getInvites(undefined, true)
      expect(invites.length).toBe(2)
    })

    it('should return only user invites for non-admin', async () => {
      await setupDb()

      await createInvite({ invitedby: '1', type: 'user' })
      await createInvite({ invitedby: '2', type: 'user' })

      const invites = await getInvites('1', false)
      expect(invites.length).toBe(1)
      expect(invites[0].invitedby).toBe('1')
    })

    it('should return empty array when no userId provided for non-admin', async () => {
      await setupDb()

      const invites = await getInvites(undefined, false)
      expect(invites.length).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // Get invite by code
  // ---------------------------------------------------------------------------

  describe('getInviteByCode', () => {
    it('should find invite by exact code', async () => {
      await setupDb()

      const result = await createInvite({ invitedby: '1', type: 'user' })
      const invite = await getInviteByCode(result.code)

      expect(invite).not.toBeNull()
      expect(invite?.code).toBe(result.code)
    })

    it('should find invite by case-insensitive code', async () => {
      await setupDb()

      const result = await createInvite({ invitedby: '1', type: 'user' })
      const upperCode = result.code.toUpperCase()
      const invite = await getInviteByCode(upperCode)

      expect(invite).not.toBeNull()
      expect(invite?.code.toLowerCase()).toBe(result.code.toLowerCase())
    })

    it('should return null for non-existent code', async () => {
      await setupDb()

      const invite = await getInviteByCode('non-existent-code')
      expect(invite).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // Verify invite
  // ---------------------------------------------------------------------------

  describe('verifyInvite', () => {
    it('should verify valid invite', async () => {
      await setupDb()

      const result = await createInvite({ invitedby: '1', type: 'user' })
      const verification = await verifyInvite(result.code)

      expect(verification.valid).toBe(true)
    })

    it('should reject non-existent invite', async () => {
      await setupDb()

      const verification = await verifyInvite('non-existent-code')

      expect(verification.valid).toBe(false)
      expect(verification.reason).toBe('Invite code not found')
    })

    it('should reject already used invite', async () => {
      await setupDb()

      const result = await createInvite({ invitedby: '1', type: 'user' })
      
      // Redeem the invite
      await redeemInvite(result.code, 'testuser', 'password123', 'test@example.com')

      const verification = await verifyInvite(result.code)

      expect(verification.valid).toBe(false)
      expect(verification.reason).toBe('Invite code has already been used')
    })

    it('should reject expired invite', async () => {
      await setupDb()
      await setSetting('invites_expiry_days', '0')

      const result = await createInvite({ invitedby: '1', type: 'user' })

      // Wait a bit to ensure expiry
      await new Promise((resolve) => setTimeout(resolve, 100))

      const verification = await verifyInvite(result.code)

      expect(verification.valid).toBe(false)
      expect(verification.reason).toBe('Invite code has expired')
    })

    it('should reject when invites are disabled', async () => {
      await setupDb()

      const result = await createInvite({ invitedby: '1', type: 'user' })
      
      await setSetting('invites_enabled', 'false')

      const verification = await verifyInvite(result.code)

      expect(verification.valid).toBe(false)
      expect(verification.reason).toBe('Invites are currently disabled')
    })
  })

  // ---------------------------------------------------------------------------
  // Redeem invite
  // ---------------------------------------------------------------------------

  describe('redeemInvite', () => {
    it('should create user and mark invite as used', async () => {
      await setupDb()

      const result = await createInvite({ invitedby: '1', type: 'user' })
      const redemption = await redeemInvite(
        result.code,
        'newuser',
        'password123',
        'newuser@example.com',
        '192.168.1.1'
      )

      expect(redemption.userId).toBeGreaterThan(0)

      const invite = await getInviteByCode(result.code)
      expect(invite?.valid).toBe('No')
      expect(invite?.usedby).toBe('newuser')
      expect(invite?.username).toBe('newuser')
      expect(invite?.ip).toBe('192.168.1.1')
      expect(invite?.dateused).not.toBeNull()
    })

    it('should reject redemption with wrong email when restricted', async () => {
      await setupDb()

      const result = await createInvite({
        email: 'specific@example.com',
        invitedby: '1',
        type: 'user',
      })

      await expect(
        redeemInvite(result.code, 'newuser', 'password123', 'wrong@example.com')
      ).rejects.toThrow('This invite is restricted to a different email address')
    })

    it('should allow redemption with correct email when restricted', async () => {
      await setupDb()

      const result = await createInvite({
        email: 'specific@example.com',
        invitedby: '1',
        type: 'user',
      })

      const redemption = await redeemInvite(
        result.code,
        'newuser',
        'password123',
        'specific@example.com'
      )

      expect(redemption.userId).toBeGreaterThan(0)
    })

    it('should reject redemption when username already exists', async () => {
      await setupDb()

      const result = await createInvite({ invitedby: '1', type: 'user' })
      
      // Create first user
      await redeemInvite(result.code, 'existinguser', 'password123', 'user1@example.com')

      // Try to create another invite and use same username
      const result2 = await createInvite({ invitedby: '1', type: 'user' })
      
      await expect(
        redeemInvite(result2.code, 'existinguser', 'password456', 'user2@example.com')
      ).rejects.toThrow('Username already exists')
    })

    it('should reject redemption of invalid invite', async () => {
      await setupDb()

      await expect(
        redeemInvite('invalid-code', 'newuser', 'password123', 'test@example.com')
      ).rejects.toThrow('Invite code not found')
    })

    it('should reject redemption of already used invite', async () => {
      await setupDb()

      const result = await createInvite({ invitedby: '1', type: 'user' })
      
      // First redemption
      await redeemInvite(result.code, 'firstuser', 'password123', 'first@example.com')

      // Second redemption should fail
      await expect(
        redeemInvite(result.code, 'seconduser', 'password456', 'second@example.com')
      ).rejects.toThrow('Invite code has already been used')
    })
  })

  // ---------------------------------------------------------------------------
  // Revoke invite
  // ---------------------------------------------------------------------------

  describe('revokeInvite', () => {
    it('should allow admin to revoke any invite', async () => {
      await setupDb()

      const result = await createInvite({ invitedby: '2', type: 'user' })
      
      await revokeInvite(result.id, '1', true)

      const invite = await getInviteByCode(result.code)
      expect(invite).toBeNull()
    })

    it('should allow user to revoke own invite when allowed', async () => {
      await setupDb()
      await setSetting('invites_allow_user_delete', 'true')

      const result = await createInvite({ invitedby: '2', type: 'user' })
      
      await revokeInvite(result.id, '2', false)

      const invite = await getInviteByCode(result.code)
      expect(invite).toBeNull()
    })

    it('should prevent user from revoking others invites', async () => {
      await setupDb()
      await setSetting('invites_allow_user_delete', 'true')

      const result = await createInvite({ invitedby: '2', type: 'user' })

      await expect(
        revokeInvite(result.id, '3', false)
      ).rejects.toThrow('You can only revoke your own invites')
    })

    it('should prevent non-admin from revoking when not allowed', async () => {
      await setupDb()
      await setSetting('invites_allow_user_delete', 'false')

      const result = await createInvite({ invitedby: '2', type: 'user' })

      await expect(
        revokeInvite(result.id, '2', false)
      ).rejects.toThrow('You do not have permission to revoke invites')
    })

    it('should throw error when invite not found', async () => {
      await setupDb()

      await expect(
        revokeInvite(999, '1', true)
      ).rejects.toThrow('Invite not found')
    })
  })
})
