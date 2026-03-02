import { eq, and, sql } from 'drizzle-orm'
import { getRawDb, getDialect, type SqliteDb, type MysqlDb, type PostgresDb } from '../db'
import * as sqliteSchema from '../db/schema/sqlite'
import * as mysqlSchema from '../db/schema/mysql'
import * as pgSchema from '../db/schema/pg'
import { hashPassword } from './auth'
import { getSettingBoolean, getSettingNumber } from './settings'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DialectResult =
  | { db: SqliteDb; invites: typeof sqliteSchema.invites; users: typeof sqliteSchema.users; dialect: 'sqlite' }
  | { db: MysqlDb; invites: typeof mysqlSchema.invites; users: typeof mysqlSchema.users; dialect: 'mysql' }
  | { db: PostgresDb; invites: typeof pgSchema.invites; users: typeof pgSchema.users; dialect: 'postgresql' }

function dialectCtx(): DialectResult {
  const dialect = getDialect()
  const raw = getRawDb()
  switch (dialect) {
    case 'sqlite':
      return { db: raw as SqliteDb, invites: sqliteSchema.invites, users: sqliteSchema.users, dialect }
    case 'mysql':
      return { db: raw as MysqlDb, invites: mysqlSchema.invites, users: mysqlSchema.users, dialect }
    case 'postgresql':
      return { db: raw as PostgresDb, invites: pgSchema.invites, users: pgSchema.users, dialect }
    default:
      throw new Error(`Unsupported dialect: ${dialect}`)
  }
}

export interface Invite {
  id: number
  code: string
  date: string | null
  email: string | null
  username: string | null
  dateused: string | null
  usedby: string | null
  ip: string | null
  valid: string | null
  type: string | null
  invitedby: string | null
}

export interface CreateInviteOptions {
  email?: string
  type?: string
  invitedby: string
}

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

export function generateInviteCode(): string {
  return crypto.randomUUID()
}

export async function createInvite(opts: CreateInviteOptions): Promise<{ id: number; code: string }> {
  const ctx = dialectCtx()
  const code = generateInviteCode()
  const now = new Date()

  // Check if invites are enabled
  const enabled = await getSettingBoolean('invites_enabled', false)
  if (!enabled) {
    throw new Error('Invites are currently disabled')
  }

  // Check per-user maximum
  const maxPerUser = await getSettingNumber('invites_max_per_user', 0)
  if (maxPerUser > 0) {
    let existingCount = 0
    
    if (ctx.dialect === 'sqlite') {
      const rows = ctx.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(ctx.invites)
        .where(and(
          eq(ctx.invites.invitedby, opts.invitedby),
          eq(ctx.invites.valid, 'Yes')
        ))
        .all()
      existingCount = rows[0]?.count ?? 0
    } else if (ctx.dialect === 'mysql') {
      const rows = await ctx.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(ctx.invites)
        .where(and(
          eq(ctx.invites.invitedby, opts.invitedby),
          eq(ctx.invites.valid, 'Yes')
        ))
      existingCount = rows[0]?.count ?? 0
    } else {
      const rows = await ctx.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(ctx.invites)
        .where(and(
          eq(ctx.invites.invitedby, opts.invitedby),
          eq(ctx.invites.valid, 'Yes')
        ))
      existingCount = rows[0]?.count ?? 0
    }

    if (existingCount >= maxPerUser) {
      throw new Error(`Maximum invite limit reached (${maxPerUser})`)
    }
  }

  if (ctx.dialect === 'sqlite') {
    const result = ctx.db.insert(ctx.invites).values({
      code,
      date: now.toISOString(),
      email: opts.email ?? null,
      type: opts.type ?? 'user',
      invitedby: opts.invitedby,
      valid: 'Yes',
      username: null,
      dateused: null,
      usedby: null,
      ip: null,
    }).returning().all()
    
    return { id: result[0].id, code }
  } else if (ctx.dialect === 'mysql') {
    const result = await ctx.db.insert(ctx.invites).values({
      code,
      date: now,
      email: opts.email ?? null,
      type: opts.type ?? 'user',
      invitedby: opts.invitedby,
      valid: 'Yes',
      username: null,
      dateused: null,
      usedby: null,
      ip: null,
    })
    
    return { id: result[0].insertId, code }
  } else {
    const result = await ctx.db.insert(ctx.invites).values({
      code,
      date: now,
      email: opts.email ?? null,
      type: opts.type ?? 'user',
      invitedby: opts.invitedby,
      valid: 'Yes',
      username: null,
      dateused: null,
      usedby: null,
      ip: null,
    }).returning()
    
    return { id: result[0].id, code }
  }
}

export async function getInvites(userId?: string, isAdmin?: boolean): Promise<Invite[]> {
  const ctx = dialectCtx()
  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    if (isAdmin) {
      rows = ctx.db.select().from(ctx.invites).all()
    } else if (userId) {
      rows = ctx.db.select().from(ctx.invites).where(eq(ctx.invites.invitedby, userId)).all()
    } else {
      rows = []
    }
  } else if (ctx.dialect === 'mysql') {
    if (isAdmin) {
      rows = await ctx.db.select().from(ctx.invites)
    } else if (userId) {
      rows = await ctx.db.select().from(ctx.invites).where(eq(ctx.invites.invitedby, userId))
    } else {
      rows = []
    }
  } else {
    if (isAdmin) {
      rows = await ctx.db.select().from(ctx.invites)
    } else if (userId) {
      rows = await ctx.db.select().from(ctx.invites).where(eq(ctx.invites.invitedby, userId))
    } else {
      rows = []
    }
  }

  return rows.map((row) => {
    const r = row as {
      id: number
      code: string
      date: string | Date | null
      email: string | null
      username: string | null
      dateused: string | Date | null
      usedby: string | null
      ip: string | null
      valid: string | null
      type: string | null
      invitedby: string | null
    }
    
    return {
      id: r.id,
      code: r.code,
      date: r.date instanceof Date ? r.date.toISOString() : r.date,
      email: r.email,
      username: r.username,
      dateused: r.dateused instanceof Date ? r.dateused.toISOString() : r.dateused,
      usedby: r.usedby,
      ip: r.ip,
      valid: r.valid,
      type: r.type,
      invitedby: r.invitedby,
    }
  })
}

export async function getInviteByCode(code: string): Promise<Invite | null> {
  const ctx = dialectCtx()
  let rows: unknown[]

  // Case-insensitive search
  if (ctx.dialect === 'sqlite') {
    rows = ctx.db.select().from(ctx.invites)
      .where(sql`LOWER(${ctx.invites.code}) = LOWER(${code})`)
      .all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db.select().from(ctx.invites)
      .where(sql`LOWER(${ctx.invites.code}) = LOWER(${code})`)
  } else {
    rows = await ctx.db.select().from(ctx.invites)
      .where(sql`LOWER(${ctx.invites.code}) = LOWER(${code})`)
  }

  if (rows.length === 0) return null

  const r = rows[0] as {
    id: number
    code: string
    date: string | Date | null
    email: string | null
    username: string | null
    dateused: string | Date | null
    usedby: string | null
    ip: string | null
    valid: string | null
    type: string | null
    invitedby: string | null
  }

  return {
    id: r.id,
    code: r.code,
    date: r.date instanceof Date ? r.date.toISOString() : r.date,
    email: r.email,
    username: r.username,
    dateused: r.dateused instanceof Date ? r.dateused.toISOString() : r.dateused,
    usedby: r.usedby,
    ip: r.ip,
    valid: r.valid,
    type: r.type,
    invitedby: r.invitedby,
  }
}

export function isInviteExpired(invite: Invite): boolean {
  if (!invite.date) return false
  
  const expiryDays = 7 // Will be configurable
  const createdAt = new Date(invite.date)
  const expiryDate = new Date(createdAt.getTime() + expiryDays * 24 * 60 * 60 * 1000)
  
  return new Date() > expiryDate
}

export async function verifyInvite(code: string): Promise<{ valid: boolean; reason?: string }> {
  const enabled = await getSettingBoolean('invites_enabled', false)
  if (!enabled) {
    return { valid: false, reason: 'Invites are currently disabled' }
  }

  const invite = await getInviteByCode(code)
  
  if (!invite) {
    return { valid: false, reason: 'Invite code not found' }
  }

  if (invite.valid !== 'Yes') {
    return { valid: false, reason: 'Invite code has already been used' }
  }

  const expiryDays = await getSettingNumber('invites_expiry_days', 7)
  if (invite.date) {
    const createdAt = new Date(invite.date)
    const expiryDate = new Date(createdAt.getTime() + expiryDays * 24 * 60 * 60 * 1000)
    
    if (new Date() > expiryDate) {
      return { valid: false, reason: 'Invite code has expired' }
    }
  }

  return { valid: true }
}

export async function redeemInvite(
  code: string,
  username: string,
  password: string,
  email: string,
  ip?: string | null
): Promise<{ userId: number }> {
  const ctx = dialectCtx()

  // Verify invite is valid
  const verification = await verifyInvite(code)
  if (!verification.valid) {
    throw new Error(verification.reason ?? 'Invalid invite code')
  }

  const invite = await getInviteByCode(code)
  if (!invite) {
    throw new Error('Invite code not found')
  }

  // Check email restriction
  if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
    throw new Error('This invite is restricted to a different email address')
  }

  // Check if username already exists
  let existingUser: unknown[]
  if (ctx.dialect === 'sqlite') {
    existingUser = ctx.db.select().from(ctx.users).where(eq(ctx.users.username, username)).all()
  } else if (ctx.dialect === 'mysql') {
    existingUser = await ctx.db.select().from(ctx.users).where(eq(ctx.users.username, username))
  } else {
    existingUser = await ctx.db.select().from(ctx.users).where(eq(ctx.users.username, username))
  }

  if (existingUser.length > 0) {
    throw new Error('Username already exists')
  }

  // Hash password
  const hashedPassword = await hashPassword(password)

  // Get default group ID from settings
  const defaultGroupId = await getSettingNumber('invites_default_group_id', 4)
  const now = new Date()

  // Create user
  let userId: number
  if (ctx.dialect === 'sqlite') {
    const result = ctx.db.insert(ctx.users).values({
      username,
      password: hashedPassword,
      email,
      auth_service: 'internal',
      group_id: defaultGroupId,
      locked: 0,
      register_date: now.toISOString(),
      image: null,
      group: null,
      plex_token: null,
      totp_secret: null,
      totp_enabled: 0,
      totp_backup_codes: null,
    }).returning().all()
    userId = result[0].id
  } else if (ctx.dialect === 'mysql') {
    const result = await ctx.db.insert(ctx.users).values({
      username,
      password: hashedPassword,
      email,
      auth_service: 'internal',
      group_id: defaultGroupId,
      locked: 0,
      register_date: now,
      image: null,
      group: null,
      plex_token: null,
      totp_secret: null,
      totp_enabled: 0,
      totp_backup_codes: null,
    })
    userId = result[0].insertId
  } else {
    const result = await ctx.db.insert(ctx.users).values({
      username,
      password: hashedPassword,
      email,
      auth_service: 'internal',
      group_id: defaultGroupId,
      locked: 0,
      register_date: now,
      image: null,
      group: null,
      plex_token: null,
      totp_secret: null,
      totp_enabled: 0,
      totp_backup_codes: null,
    }).returning()
    userId = result[0].id
  }

  // Mark invite as used
  if (ctx.dialect === 'sqlite') {
    ctx.db.update(ctx.invites)
      .set({
        valid: 'No',
        usedby: username,
        dateused: now.toISOString(),
        username,
        ip: ip ?? null,
      })
      .where(eq(ctx.invites.id, invite.id))
      .run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db.update(ctx.invites)
      .set({
        valid: 'No',
        usedby: username,
        dateused: now,
        username,
        ip: ip ?? null,
      })
      .where(eq(ctx.invites.id, invite.id))
  } else {
    await ctx.db.update(ctx.invites)
      .set({
        valid: 'No',
        usedby: username,
        dateused: now,
        username,
        ip: ip ?? null,
      })
      .where(eq(ctx.invites.id, invite.id))
  }

  return { userId }
}

export async function revokeInvite(id: number, userId: string, isAdmin: boolean): Promise<void> {
  const ctx = dialectCtx()

  // Get invite to check ownership
  let rows: unknown[]
  if (ctx.dialect === 'sqlite') {
    rows = ctx.db.select().from(ctx.invites).where(eq(ctx.invites.id, id)).all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db.select().from(ctx.invites).where(eq(ctx.invites.id, id))
  } else {
    rows = await ctx.db.select().from(ctx.invites).where(eq(ctx.invites.id, id))
  }

  if (rows.length === 0) {
    throw new Error('Invite not found')
  }

  const invite = rows[0] as { invitedby: string | null }

  // Check permissions
  if (!isAdmin) {
    const allowUserDelete = await getSettingBoolean('invites_allow_user_delete', false)
    if (!allowUserDelete) {
      throw new Error('You do not have permission to revoke invites')
    }
    
    if (invite.invitedby !== userId) {
      throw new Error('You can only revoke your own invites')
    }
  }

  // Delete invite
  if (ctx.dialect === 'sqlite') {
    ctx.db.delete(ctx.invites).where(eq(ctx.invites.id, id)).run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db.delete(ctx.invites).where(eq(ctx.invites.id, id))
  } else {
    await ctx.db.delete(ctx.invites).where(eq(ctx.invites.id, id))
  }
}
