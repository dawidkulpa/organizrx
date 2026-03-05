import { eq, and, sql } from 'drizzle-orm'

import { dialectCtx } from '../../db/dialect-ctx'
import { getSettingBoolean, getSettingNumber } from '../settings'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
// CRUD Operations
// ---------------------------------------------------------------------------

export async function createInvite(
  opts: CreateInviteOptions
): Promise<{ id: number; code: string }> {
  const { generateInviteCode } = await import('./logic')
  const ctx = dialectCtx('invites')
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
        .where(and(eq(ctx.invites.invitedby, opts.invitedby), eq(ctx.invites.valid, 'Yes')))
        .all()
      existingCount = rows[0]?.count ?? 0
    } else if (ctx.dialect === 'mysql') {
      const rows = await ctx.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(ctx.invites)
        .where(and(eq(ctx.invites.invitedby, opts.invitedby), eq(ctx.invites.valid, 'Yes')))
      existingCount = rows[0]?.count ?? 0
    } else {
      const rows = await ctx.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(ctx.invites)
        .where(and(eq(ctx.invites.invitedby, opts.invitedby), eq(ctx.invites.valid, 'Yes')))
      existingCount = rows[0]?.count ?? 0
    }

    if (existingCount >= maxPerUser) {
      throw new Error(`Maximum invite limit reached (${maxPerUser})`)
    }
  }

  if (ctx.dialect === 'sqlite') {
    const result = ctx.db
      .insert(ctx.invites)
      .values({
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
      })
      .returning()
      .all()

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
    const result = await ctx.db
      .insert(ctx.invites)
      .values({
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
      .returning()

    return { id: result[0].id, code }
  }
}

export async function getInvites(userId?: string, isAdmin?: boolean): Promise<Invite[]> {
  const ctx = dialectCtx('invites')
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
  const ctx = dialectCtx('invites')
  let rows: unknown[]

  // Case-insensitive search
  if (ctx.dialect === 'sqlite') {
    rows = ctx.db
      .select()
      .from(ctx.invites)
      .where(sql`LOWER(${ctx.invites.code}) = LOWER(${code})`)
      .all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db
      .select()
      .from(ctx.invites)
      .where(sql`LOWER(${ctx.invites.code}) = LOWER(${code})`)
  } else {
    rows = await ctx.db
      .select()
      .from(ctx.invites)
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

export async function revokeInvite(id: number, userId: string, isAdmin: boolean): Promise<void> {
  const ctx = dialectCtx('invites')

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
