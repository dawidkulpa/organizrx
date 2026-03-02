import { SignJWT, jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose'
import { eq } from 'drizzle-orm'

import { getEnv, getConfig } from '../config'
import { getRawDb, getDialect, type SqliteDb, type MysqlDb, type PostgresDb } from '../db'
import * as sqliteSchema from '../db/schema/sqlite'
import * as mysqlSchema from '../db/schema/mysql'
import * as pgSchema from '../db/schema/pg'

import type { AuthUser } from '@organizrx/shared'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AccessTokenPayload extends JoseJWTPayload {
  name: string
  group: string | null
  groupID: number | null
  userID: number
  email: string | null
  image: string | null
}

export interface RefreshTokenPayload extends JoseJWTPayload {
  userId: number
  type: 'refresh'
}

interface LockoutEntry {
  attempts: number
  lockedUntil: number | null
}

const lockoutMap = new Map<string, LockoutEntry>()

// ---------------------------------------------------------------------------
// Dialect helpers — reduce switch/case boilerplate
// ---------------------------------------------------------------------------

function getJwtSecret(): Uint8Array {
  const secret = getEnv().JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured')
  return new TextEncoder().encode(secret)
}

type DialectResult =
  | { db: SqliteDb; tokens: typeof sqliteSchema.tokens; users: typeof sqliteSchema.users; dialect: 'sqlite' }
  | { db: MysqlDb; tokens: typeof mysqlSchema.tokens; users: typeof mysqlSchema.users; dialect: 'mysql' }
  | { db: PostgresDb; tokens: typeof pgSchema.tokens; users: typeof pgSchema.users; dialect: 'postgresql' }

function dialectCtx(): DialectResult {
  const dialect = getDialect()
  const raw = getRawDb()
  switch (dialect) {
    case 'sqlite':
      return { db: raw as SqliteDb, tokens: sqliteSchema.tokens, users: sqliteSchema.users, dialect }
    case 'mysql':
      return { db: raw as MysqlDb, tokens: mysqlSchema.tokens, users: mysqlSchema.users, dialect }
    case 'postgresql':
      return { db: raw as PostgresDb, tokens: pgSchema.tokens, users: pgSchema.users, dialect }
    default:
      throw new Error(`Unsupported dialect: ${dialect}`)
  }
}

// ---------------------------------------------------------------------------
// Password hashing (Bun.password handles legacy PHP $2y$ prefixes natively)
// ---------------------------------------------------------------------------

export async function hashPassword(plain: string): Promise<string> {
  const { auth } = getConfig()
  return Bun.password.hash(plain, { algorithm: 'bcrypt', cost: auth.bcryptRounds })
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return Bun.password.verify(plain, hash)
}

// ---------------------------------------------------------------------------
// JWT — Access tokens (short-lived, default 15 min)
// ---------------------------------------------------------------------------

export async function createAccessToken(user: AuthUser): Promise<string> {
  const { auth } = getConfig()
  const expirySeconds = Math.floor(auth.accessTokenExpiryMs / 1000)

  return new SignJWT({
    name: user.username,
    group: user.group,
    groupID: user.group_id,
    userID: user.id,
    email: user.email,
    image: user.image,
  } satisfies Omit<AccessTokenPayload, keyof JoseJWTPayload>)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setIssuer('OrganizrX')
    .setExpirationTime(`${expirySeconds}s`)
    .sign(getJwtSecret())
}

// algorithms: ['HS256'] required to prevent algorithm confusion attacks
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    algorithms: ['HS256'],
    issuer: 'OrganizrX',
  })
  return payload as AccessTokenPayload
}

// ---------------------------------------------------------------------------
// JWT — Refresh tokens (long-lived, default 7 days)
// ---------------------------------------------------------------------------

export async function createRefreshToken(userId: number, rememberMe?: boolean): Promise<string> {
  const { auth } = getConfig()
  const days = rememberMe ? auth.rememberMeDays : auth.refreshTokenExpiryDays

  return new SignJWT({
    userId,
    type: 'refresh' as const,
  } satisfies Omit<RefreshTokenPayload, keyof JoseJWTPayload>)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setIssuer('OrganizrX')
    .setExpirationTime(`${days}d`)
    .sign(getJwtSecret())
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    algorithms: ['HS256'],
    issuer: 'OrganizrX',
  })

  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type: expected refresh token')
  }

  return payload as RefreshTokenPayload
}

// ---------------------------------------------------------------------------
// Token storage (DB)
// ---------------------------------------------------------------------------

export async function storeRefreshToken(opts: {
  userId: number
  token: string
  browser: string | null
  ip: string | null
  expiresAt: Date
}): Promise<void> {
  const ctx = dialectCtx()
  const now = new Date()

  if (ctx.dialect === 'sqlite') {
    // SQLite tokens table uses text columns
    ctx.db.insert(ctx.tokens).values({
      token: opts.token,
      user_id: opts.userId,
      browser: opts.browser,
      ip: opts.ip,
      created: now.toISOString(),
      expires: opts.expiresAt.toISOString(),
    }).run()
  } else if (ctx.dialect === 'mysql') {
    // MySQL tokens table uses timestamp columns (Date objects)
    await ctx.db.insert(ctx.tokens).values({
      token: opts.token,
      user_id: opts.userId,
      browser: opts.browser,
      ip: opts.ip,
      created: now,
      expires: opts.expiresAt,
    })
  } else {
    // PostgreSQL tokens table uses timestamp columns (Date objects)
    await ctx.db.insert(ctx.tokens).values({
      token: opts.token,
      user_id: opts.userId,
      browser: opts.browser,
      ip: opts.ip,
      created: now,
      expires: opts.expiresAt,
    })
  }
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const ctx = dialectCtx()

  if (ctx.dialect === 'sqlite') {
    ctx.db.delete(ctx.tokens).where(eq(ctx.tokens.token, token)).run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db.delete(ctx.tokens).where(eq(ctx.tokens.token, token))
  } else {
    await ctx.db.delete(ctx.tokens).where(eq(ctx.tokens.token, token))
  }
}

export async function revokeAllUserTokens(userId: number): Promise<void> {
  const ctx = dialectCtx()

  if (ctx.dialect === 'sqlite') {
    ctx.db.delete(ctx.tokens).where(eq(ctx.tokens.user_id, userId)).run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db.delete(ctx.tokens).where(eq(ctx.tokens.user_id, userId))
  } else {
    await ctx.db.delete(ctx.tokens).where(eq(ctx.tokens.user_id, userId))
  }
}

export async function isRefreshTokenValid(token: string): Promise<boolean> {
  const ctx = dialectCtx()

  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db.select().from(ctx.tokens).where(eq(ctx.tokens.token, token)).all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db.select().from(ctx.tokens).where(eq(ctx.tokens.token, token))
  } else {
    rows = await ctx.db.select().from(ctx.tokens).where(eq(ctx.tokens.token, token))
  }

  if (rows.length === 0) return false

  const record = rows[0] as { expires: string }
  return new Date(record.expires) > new Date()
}

// ---------------------------------------------------------------------------
// User lookup
// ---------------------------------------------------------------------------

export async function findUserByUsername(username: string): Promise<{
  id: number
  username: string
  password: string
  email: string | null
  group: string | null
  group_id: number | null
  image: string | null
  locked: number | null
} | null> {
  const ctx = dialectCtx()

  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db.select().from(ctx.users).where(eq(ctx.users.username, username)).all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db.select().from(ctx.users).where(eq(ctx.users.username, username))
  } else {
    rows = await ctx.db.select().from(ctx.users).where(eq(ctx.users.username, username))
  }

  if (rows.length === 0) return null
  return rows[0] as {
    id: number
    username: string
    password: string
    email: string | null
    group: string | null
    group_id: number | null
    image: string | null
    locked: number | null
  }
}

export async function findUserById(userId: number): Promise<AuthUser | null> {
  const ctx = dialectCtx()

  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db.select({
      id: ctx.users.id,
      username: ctx.users.username,
      email: ctx.users.email,
      group: ctx.users.group,
      group_id: ctx.users.group_id,
      image: ctx.users.image,
    }).from(ctx.users).where(eq(ctx.users.id, userId)).all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db.select({
      id: ctx.users.id,
      username: ctx.users.username,
      email: ctx.users.email,
      group: ctx.users.group,
      group_id: ctx.users.group_id,
      image: ctx.users.image,
    }).from(ctx.users).where(eq(ctx.users.id, userId))
  } else {
    rows = await ctx.db.select({
      id: ctx.users.id,
      username: ctx.users.username,
      email: ctx.users.email,
      group: ctx.users.group,
      group_id: ctx.users.group_id,
      image: ctx.users.image,
    }).from(ctx.users).where(eq(ctx.users.id, userId))
  }

  if (rows.length === 0) return null

  const row = rows[0] as {
    id: number
    username: string | null
    email: string | null
    group: string | null
    group_id: number | null
    image: string | null
  }

  return toAuthUser(row)
}

// ---------------------------------------------------------------------------
// Lockout logic — in-memory, server-side (not bypassable via cookies)
// ---------------------------------------------------------------------------

export function checkLockout(username: string): { locked: boolean; remainingMs: number } {
  const key = username.toLowerCase()
  const entry = lockoutMap.get(key)

  if (!entry || !entry.lockedUntil) {
    return { locked: false, remainingMs: 0 }
  }

  const now = Date.now()
  if (now >= entry.lockedUntil) {
    lockoutMap.delete(key)
    return { locked: false, remainingMs: 0 }
  }

  return { locked: true, remainingMs: entry.lockedUntil - now }
}

export function recordFailedAttempt(username: string): void {
  const { auth } = getConfig()
  const key = username.toLowerCase()
  const entry = lockoutMap.get(key) ?? { attempts: 0, lockedUntil: null }

  entry.attempts += 1

  if (entry.attempts >= auth.loginAttempts) {
    entry.lockedUntil = Date.now() + auth.loginLockoutMs
  }

  lockoutMap.set(key, entry)
}

export function clearFailedAttempts(username: string): void {
  lockoutMap.delete(username.toLowerCase())
}

export function toAuthUser(row: {
  id: number
  username: string | null
  email: string | null
  group: string | null
  group_id: number | null
  image: string | null
}): AuthUser {
  return {
    id: row.id,
    username: row.username ?? '',
    email: row.email,
    group: row.group,
    group_id: row.group_id,
    image: row.image,
  }
}

// ---------------------------------------------------------------------------
// Testing helpers
// ---------------------------------------------------------------------------

export function _resetLockoutMap(): void {
  lockoutMap.clear()
}
