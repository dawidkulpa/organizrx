import { eq } from 'drizzle-orm'

import { dialectCtx } from '../../db/dialect-ctx'
import { toAuthUser } from './lockout'

import type { AuthUser } from '@organizrx/shared'

// ---------------------------------------------------------------------------
// User lookup
// ---------------------------------------------------------------------------

export async function findUserByUsername(username: string): Promise<{
  id: number
  username: string
  password: string
  email: string | null
  groupName: string | null
  group_id: number | null
  image: string | null
  locked: number | null
} | null> {
  const ctx = dialectCtx('users')

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
    groupName: string | null
    group_id: number | null
    image: string | null
    locked: number | null
  }
}

export async function findUserById(userId: number): Promise<AuthUser | null> {
  const ctx = dialectCtx('users')

  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db
      .select({
        id: ctx.users.id,
        username: ctx.users.username,
        email: ctx.users.email,
        groupName: ctx.users.groupName,
        group_id: ctx.users.group_id,
        image: ctx.users.image,
      })
      .from(ctx.users)
      .where(eq(ctx.users.id, userId))
      .all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db
      .select({
        id: ctx.users.id,
        username: ctx.users.username,
        email: ctx.users.email,
        groupName: ctx.users.groupName,
        group_id: ctx.users.group_id,
        image: ctx.users.image,
      })
      .from(ctx.users)
      .where(eq(ctx.users.id, userId))
  } else {
    rows = await ctx.db
      .select({
        id: ctx.users.id,
        username: ctx.users.username,
        email: ctx.users.email,
        groupName: ctx.users.groupName,
        group_id: ctx.users.group_id,
        image: ctx.users.image,
      })
      .from(ctx.users)
      .where(eq(ctx.users.id, userId))
  }

  if (rows.length === 0) return null

  const row = rows[0] as {
    id: number
    username: string | null
    email: string | null
    groupName: string | null
    group_id: number | null
    image: string | null
  }

  return toAuthUser(row)
}
