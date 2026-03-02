import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import {
  generateTotpSecret,
  verifyTotpCode,
  encryptSecret,
  decryptSecret,
  generateBackupCodes,
  verifyBackupCode,
  enableTwoFactor,
  disableTwoFactor,
  updateBackupCodes,
  getUserTotpData,
  createTempToken,
  verifyTempToken,
} from './auth-2fa'
import { hashPassword } from './auth'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniqueDbPath(suffix = '2fa'): string {
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

  return db
}

async function createTestUser(db: SqliteDb, username: string) {
  const password = await hashPassword('testpassword')
  db.$client
    .prepare(
      `INSERT INTO users (username, password, email, "group", group_id, locked, auth_service, totp_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(username, password, `${username}@test.com`, 'User', 999, 0, 'internal', 0)

  const result = db.$client.prepare('SELECT id FROM users WHERE username = ?').get(username) as {
    id: number
  }
  return result.id
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('auth-2fa service', () => {
  let db: SqliteDb

  beforeEach(async () => {
    db = await setupDb()
  })

  afterEach(async () => {
    await closeDb()
  })

  describe('generateTotpSecret', () => {
    it('should generate a valid TOTP secret and QR URI', () => {
      const username = 'testuser'
      const { secret, qrUri } = generateTotpSecret(username)

      expect(secret).toBeDefined()
      expect(secret.length).toBeGreaterThan(0)
      expect(qrUri).toContain('otpauth://totp/OrganizrX:testuser')
      expect(qrUri).toContain('issuer=OrganizrX')
      expect(qrUri).toContain('secret=')
    })
  })

  describe('verifyTotpCode', () => {
    it('should verify a valid TOTP code', () => {
      const { secret } = generateTotpSecret('testuser')
      const OTPAuth = require('otpauth')
      const totp = new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(secret),
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      })

      const token = totp.generate()
      const isValid = verifyTotpCode(secret, token)

      expect(isValid).toBe(true)
    })

    it('should reject an invalid TOTP code', () => {
      const { secret } = generateTotpSecret('testuser')
      const isValid = verifyTotpCode(secret, '000000')

      expect(isValid).toBe(false)
    })

    it('should reject an invalid secret', () => {
      const isValid = verifyTotpCode('INVALIDSECRET', '123456')

      expect(isValid).toBe(false)
    })
  })

  describe('encryptSecret and decryptSecret', () => {
    it('should encrypt and decrypt a secret', () => {
      const plainSecret = 'JBSWY3DPEHPK3PXP'
      const encrypted = encryptSecret(plainSecret)

      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(plainSecret)
      expect(encrypted).toContain(':')

      const decrypted = decryptSecret(encrypted)
      expect(decrypted).toBe(plainSecret)
    })

    it('should produce different ciphertexts for same plaintext', () => {
      const plainSecret = 'JBSWY3DPEHPK3PXP'
      const encrypted1 = encryptSecret(plainSecret)
      const encrypted2 = encryptSecret(plainSecret)

      expect(encrypted1).not.toBe(encrypted2)
      expect(decryptSecret(encrypted1)).toBe(plainSecret)
      expect(decryptSecret(encrypted2)).toBe(plainSecret)
    })
  })

  describe('generateBackupCodes', () => {
    it('should generate 8 backup codes', async () => {
      const { plain, hashed } = await generateBackupCodes()

      expect(plain.length).toBe(8)
      expect(hashed.length).toBe(8)
      expect(plain[0]).not.toBe(hashed[0])

      for (const code of plain) {
        expect(code.length).toBe(8)
        expect(code).toMatch(/^[0-9A-F]{8}$/)
      }
    })
  })

  describe('verifyBackupCode', () => {
    it('should verify a valid backup code and remove it', async () => {
      const { plain, hashed } = await generateBackupCodes()
      const testCode = plain[3]

      const { valid, remainingCodes } = await verifyBackupCode(testCode, hashed)

      expect(valid).toBe(true)
      expect(remainingCodes.length).toBe(7)
      expect(remainingCodes).not.toContain(hashed[3])
    })

    it('should reject an invalid backup code', async () => {
      const { hashed } = await generateBackupCodes()
      const { valid, remainingCodes } = await verifyBackupCode('INVALID1', hashed)

      expect(valid).toBe(false)
      expect(remainingCodes.length).toBe(8)
    })
  })

  describe('enableTwoFactor', () => {
    it('should enable 2FA for a user', async () => {
      const userId = await createTestUser(db, 'testuser')
      const { secret } = generateTotpSecret('testuser')
      const encryptedSecret = encryptSecret(secret)
      const { hashed } = await generateBackupCodes()

      await enableTwoFactor(userId, encryptedSecret, hashed)

      const totpData = await getUserTotpData(userId)
      expect(totpData).toBeDefined()
      expect(totpData?.totp_enabled).toBe(1)
      expect(totpData?.totp_secret).toBe(encryptedSecret)
      expect(totpData?.totp_backup_codes).toBeDefined()

      const backupCodes = JSON.parse(totpData!.totp_backup_codes!)
      expect(backupCodes.length).toBe(8)
    })
  })

  describe('disableTwoFactor', () => {
    it('should disable 2FA for a user', async () => {
      const userId = await createTestUser(db, 'testuser')
      const { secret } = generateTotpSecret('testuser')
      const encryptedSecret = encryptSecret(secret)
      const { hashed } = await generateBackupCodes()

      await enableTwoFactor(userId, encryptedSecret, hashed)
      let totpData = await getUserTotpData(userId)
      expect(totpData?.totp_enabled).toBe(1)

      await disableTwoFactor(userId)

      totpData = await getUserTotpData(userId)
      expect(totpData?.totp_enabled).toBe(0)
      expect(totpData?.totp_secret).toBeNull()
      expect(totpData?.totp_backup_codes).toBeNull()
    })
  })

  describe('updateBackupCodes', () => {
    it('should update backup codes for a user', async () => {
      const userId = await createTestUser(db, 'testuser')
      const { secret } = generateTotpSecret('testuser')
      const encryptedSecret = encryptSecret(secret)
      const { hashed: originalCodes } = await generateBackupCodes()

      await enableTwoFactor(userId, encryptedSecret, originalCodes)

      const { hashed: newCodes } = await generateBackupCodes()
      await updateBackupCodes(userId, newCodes)

      const totpData = await getUserTotpData(userId)
      const backupCodes = JSON.parse(totpData!.totp_backup_codes!)
      expect(backupCodes).toEqual(newCodes)
      expect(backupCodes).not.toEqual(originalCodes)
    })
  })

  describe('createTempToken and verifyTempToken', () => {
    it('should create and verify a temporary token', async () => {
      const userId = 123
      const token = await createTempToken(userId)

      expect(token).toBeDefined()
      expect(token.length).toBeGreaterThan(0)

      const payload = await verifyTempToken(token)
      expect(payload.userId).toBe(userId)
      expect(payload.type).toBe('2fa_challenge')
    })

    it('should reject an invalid token', async () => {
      const invalidToken = 'invalid.token.here'

      await expect(verifyTempToken(invalidToken)).rejects.toThrow()
    })

    it('should reject a token with wrong type', async () => {
      const { createAccessToken } = await import('./auth')
      const user = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        group: 'User',
        group_id: 999,
        image: null,
      }
      const accessToken = await createAccessToken(user)

      await expect(verifyTempToken(accessToken)).rejects.toThrow()
    })
  })

  describe('integration: full 2FA flow', () => {
    it('should complete setup, verify, and disable flow', async () => {
      const userId = await createTestUser(db, 'testuser')

      const { secret, qrUri } = generateTotpSecret('testuser')
      expect(secret).toBeDefined()
      expect(qrUri).toContain('otpauth://totp/OrganizrX:testuser')

      const OTPAuth = require('otpauth')
      const totp = new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(secret),
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      })
      const token = totp.generate()
      const isValid = verifyTotpCode(secret, token)
      expect(isValid).toBe(true)

      const encryptedSecret = encryptSecret(secret)
      const { hashed: hashedBackupCodes } = await generateBackupCodes()
      await enableTwoFactor(userId, encryptedSecret, hashedBackupCodes)

      const totpData = await getUserTotpData(userId)
      expect(totpData?.totp_enabled).toBe(1)

      const tempToken = await createTempToken(userId)
      const payload = await verifyTempToken(tempToken)
      expect(payload.userId).toBe(userId)

      const decryptedSecret = decryptSecret(totpData!.totp_secret!)
      expect(decryptedSecret).toBe(secret)

      const token2 = totp.generate()
      const isValid2 = verifyTotpCode(decryptedSecret, token2)
      expect(isValid2).toBe(true)

      await disableTwoFactor(userId)
      const totpDataAfterDisable = await getUserTotpData(userId)
      expect(totpDataAfterDisable?.totp_enabled).toBe(0)
    })

    it('should verify using backup code', async () => {
      const userId = await createTestUser(db, 'testuser')
      const { secret } = generateTotpSecret('testuser')
      const encryptedSecret = encryptSecret(secret)
      const { plain, hashed } = await generateBackupCodes()

      await enableTwoFactor(userId, encryptedSecret, hashed)

      const totpData = await getUserTotpData(userId)
      const backupCodes = JSON.parse(totpData!.totp_backup_codes!)

      const testCode = plain[2]
      const { valid, remainingCodes } = await verifyBackupCode(testCode, backupCodes)

      expect(valid).toBe(true)
      expect(remainingCodes.length).toBe(7)

      await updateBackupCodes(userId, remainingCodes)

      const updatedTotpData = await getUserTotpData(userId)
      const updatedBackupCodes = JSON.parse(updatedTotpData!.totp_backup_codes!)
      expect(updatedBackupCodes.length).toBe(7)
    })
  })
})
