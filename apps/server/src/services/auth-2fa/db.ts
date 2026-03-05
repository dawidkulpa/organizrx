import { SignJWT, jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose'
import { eq } from 'drizzle-orm'

import { getEnv } from '../../config'
import { dialectCtx } from '../../db/dialect-ctx'

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
// Helpers
// ---------------------------------------------------------------------------

function getJwtSecret(): Uint8Array {
  const secret = getEnv().JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured')
  return new TextEncoder().encode(secret)
}

// ---------------------------------------------------------------------------
// Database operations
// ---------------------------------------------------------------------------

export async function enableTwoFactor(
  userId: number,
  encryptedSecret: string,
  hashedBackupCodes: string[]
): Promise<void> {
  const ctx = dialectCtx('users')
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
  const ctx = dialectCtx('users')

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
  const ctx = dialectCtx('users')
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
  const ctx = dialectCtx('users')

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
