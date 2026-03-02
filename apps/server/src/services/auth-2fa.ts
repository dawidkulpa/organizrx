import { SignJWT, jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose'
import * as OTPAuth from 'otpauth'
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'
import { eq } from 'drizzle-orm'

import { getEnv } from '../config'
import { getRawDb, getDialect, type SqliteDb, type MysqlDb, type PostgresDb } from '../db'
import * as sqliteSchema from '../db/schema/sqlite'
import * as mysqlSchema from '../db/schema/mysql'
import * as pgSchema from '../db/schema/pg'
import { hashPassword, verifyPassword } from './auth'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TotpSetupResponse {
  secret: string
  qrUri: string
  backupCodes: string[]
}

export interface TempTokenPayload extends JoseJWTPayload {
  userId: number
  type: '2fa_challenge'
}

// ---------------------------------------------------------------------------
// Dialect helpers
// ---------------------------------------------------------------------------

type DialectResult =
  | { db: SqliteDb; users: typeof sqliteSchema.users; dialect: 'sqlite' }
  | { db: MysqlDb; users: typeof mysqlSchema.users; dialect: 'mysql' }
  | { db: PostgresDb; users: typeof pgSchema.users; dialect: 'postgresql' }

function dialectCtx(): DialectResult {
  const dialect = getDialect()
  const raw = getRawDb()
  switch (dialect) {
    case 'sqlite':
      return { db: raw as SqliteDb, users: sqliteSchema.users, dialect }
    case 'mysql':
      return { db: raw as MysqlDb, users: mysqlSchema.users, dialect }
    case 'postgresql':
      return { db: raw as PostgresDb, users: pgSchema.users, dialect }
    default:
      throw new Error(`Unsupported dialect: ${dialect}`)
  }
}

function getJwtSecret(): Uint8Array {
  const secret = getEnv().JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured')
  return new TextEncoder().encode(secret)
}

function getEncryptionKey(): Buffer {
  const secret = getEnv().JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured')
  return createHash('sha256').update(secret).digest()
}

// ---------------------------------------------------------------------------
// TOTP generation and verification
// ---------------------------------------------------------------------------

export function generateTotpSecret(username: string): { secret: string; qrUri: string } {
  const secret = new OTPAuth.Secret({ size: 20 })
  const totp = new OTPAuth.TOTP({
    issuer: 'OrganizrX',
    label: username,
    secret,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  })

  return {
    secret: secret.base32,
    qrUri: totp.toString(),
  }
}

export function verifyTotpCode(secret: string, token: string): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(secret),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    })

    const delta = totp.validate({ token, window: 1 })
    return delta !== null
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Secret encryption/decryption
// ---------------------------------------------------------------------------

export function encryptSecret(plainSecret: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  let encrypted = cipher.update(plainSecret, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decryptSecret(encryptedSecret: string): string {
  const key = getEncryptionKey()
  const [ivHex, authTagHex, encrypted] = encryptedSecret.split(':')

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

// ---------------------------------------------------------------------------
// Backup codes
// ---------------------------------------------------------------------------

export async function generateBackupCodes(): Promise<{ plain: string[]; hashed: string[] }> {
  const codes: string[] = []
  const hashed: string[] = []

  for (let i = 0; i < 8; i++) {
    const code = randomBytes(4).toString('hex').toUpperCase()
    codes.push(code)
    hashed.push(await hashPassword(code))
  }

  return { plain: codes, hashed }
}

export async function verifyBackupCode(
  code: string,
  hashedCodes: string[]
): Promise<{ valid: boolean; remainingCodes: string[] }> {
  for (let i = 0; i < hashedCodes.length; i++) {
    const isValid = await verifyPassword(code, hashedCodes[i])
    if (isValid) {
      const remainingCodes = [...hashedCodes]
      remainingCodes.splice(i, 1)
      return { valid: true, remainingCodes }
    }
  }

  return { valid: false, remainingCodes: hashedCodes }
}

// ---------------------------------------------------------------------------
// Database operations
// ---------------------------------------------------------------------------

export async function enableTwoFactor(
  userId: number,
  encryptedSecret: string,
  hashedBackupCodes: string[]
): Promise<void> {
  const ctx = dialectCtx()
  const backupCodesJson = JSON.stringify(hashedBackupCodes)

  if (ctx.dialect === 'sqlite') {
    ctx.db
      .update(ctx.users)
      .set({
        totp_secret: encryptedSecret,
        totp_enabled: 1,
        totp_backup_codes: backupCodesJson,
      })
      .where(eq(ctx.users.id, userId))
      .run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db
      .update(ctx.users)
      .set({
        totp_secret: encryptedSecret,
        totp_enabled: 1,
        totp_backup_codes: backupCodesJson,
      })
      .where(eq(ctx.users.id, userId))
  } else {
    await ctx.db
      .update(ctx.users)
      .set({
        totp_secret: encryptedSecret,
        totp_enabled: 1,
        totp_backup_codes: backupCodesJson,
      })
      .where(eq(ctx.users.id, userId))
  }
}

export async function disableTwoFactor(userId: number): Promise<void> {
  const ctx = dialectCtx()

  if (ctx.dialect === 'sqlite') {
    ctx.db
      .update(ctx.users)
      .set({
        totp_secret: null,
        totp_enabled: 0,
        totp_backup_codes: null,
      })
      .where(eq(ctx.users.id, userId))
      .run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db
      .update(ctx.users)
      .set({
        totp_secret: null,
        totp_enabled: 0,
        totp_backup_codes: null,
      })
      .where(eq(ctx.users.id, userId))
  } else {
    await ctx.db
      .update(ctx.users)
      .set({
        totp_secret: null,
        totp_enabled: 0,
        totp_backup_codes: null,
      })
      .where(eq(ctx.users.id, userId))
  }
}

export async function updateBackupCodes(userId: number, hashedCodes: string[]): Promise<void> {
  const ctx = dialectCtx()
  const backupCodesJson = JSON.stringify(hashedCodes)

  if (ctx.dialect === 'sqlite') {
    ctx.db
      .update(ctx.users)
      .set({
        totp_backup_codes: backupCodesJson,
      })
      .where(eq(ctx.users.id, userId))
      .run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db
      .update(ctx.users)
      .set({
        totp_backup_codes: backupCodesJson,
      })
      .where(eq(ctx.users.id, userId))
  } else {
    await ctx.db
      .update(ctx.users)
      .set({
        totp_backup_codes: backupCodesJson,
      })
      .where(eq(ctx.users.id, userId))
  }
}

export async function getUserTotpData(userId: number): Promise<{
  totp_secret: string | null
  totp_enabled: number | null
  totp_backup_codes: string | null
} | null> {
  const ctx = dialectCtx()

  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db
      .select({
        totp_secret: ctx.users.totp_secret,
        totp_enabled: ctx.users.totp_enabled,
        totp_backup_codes: ctx.users.totp_backup_codes,
      })
      .from(ctx.users)
      .where(eq(ctx.users.id, userId))
      .all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db
      .select({
        totp_secret: ctx.users.totp_secret,
        totp_enabled: ctx.users.totp_enabled,
        totp_backup_codes: ctx.users.totp_backup_codes,
      })
      .from(ctx.users)
      .where(eq(ctx.users.id, userId))
  } else {
    rows = await ctx.db
      .select({
        totp_secret: ctx.users.totp_secret,
        totp_enabled: ctx.users.totp_enabled,
        totp_backup_codes: ctx.users.totp_backup_codes,
      })
      .from(ctx.users)
      .where(eq(ctx.users.id, userId))
  }

  if (rows.length === 0) return null

  return rows[0] as {
    totp_secret: string | null
    totp_enabled: number | null
    totp_backup_codes: string | null
  }
}

// ---------------------------------------------------------------------------
// Temporary challenge tokens
// ---------------------------------------------------------------------------

export async function createTempToken(userId: number): Promise<string> {
  return new SignJWT({
    userId,
    type: '2fa_challenge' as const,
  } satisfies Omit<TempTokenPayload, keyof JoseJWTPayload>)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setIssuer('OrganizrX')
    .setExpirationTime('5m')
    .sign(getJwtSecret())
}

export async function verifyTempToken(token: string): Promise<TempTokenPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    algorithms: ['HS256'],
    issuer: 'OrganizrX',
  })

  if (payload.type !== '2fa_challenge') {
    throw new Error('Invalid token type: expected 2fa_challenge')
  }

  return payload as TempTokenPayload
}
