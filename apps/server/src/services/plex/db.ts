import { eq, or } from 'drizzle-orm'

import { dialectCtx } from '../../db/dialect-ctx'
import { toAuthUser } from '../auth'
import { verifyPlexToken, type PlexUserInfo } from './client'

import type { AuthUser } from '@organizrx/shared'

// ---------------------------------------------------------------------------
// User Creation / Lookup
// ---------------------------------------------------------------------------

export async function findOrCreatePlexUser(
  plexUser: PlexUserInfo,
  plexToken: string,
  groupId: number
): Promise<AuthUser> {
  const ctx = dialectCtx('users', 'groups')

  // Try to find existing user by email or username
  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db
      .select()
      .from(ctx.users)
      .where(or(eq(ctx.users.email, plexUser.email), eq(ctx.users.username, plexUser.username)))
      .all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db
      .select()
      .from(ctx.users)
      .where(or(eq(ctx.users.email, plexUser.email), eq(ctx.users.username, plexUser.username)))
  } else {
    rows = await ctx.db
      .select()
      .from(ctx.users)
      .where(or(eq(ctx.users.email, plexUser.email), eq(ctx.users.username, plexUser.username)))
  }

  if (rows.length > 0) {
    // Update existing user with Plex token
    const existingUser = rows[0] as {
      id: number
      username: string | null
      email: string | null
      groupName: string | null
      group_id: number | null
      image: string | null
    }

    if (ctx.dialect === 'sqlite') {
      ctx.db
        .update(ctx.users)
        .set({ plex_token: plexToken, auth_service: 'plex', image: plexUser.thumb })
        .where(eq(ctx.users.id, existingUser.id))
        .run()
    } else if (ctx.dialect === 'mysql') {
      await ctx.db
        .update(ctx.users)
        .set({ plex_token: plexToken, auth_service: 'plex', image: plexUser.thumb })
        .where(eq(ctx.users.id, existingUser.id))
    } else {
      await ctx.db
        .update(ctx.users)
        .set({ plex_token: plexToken, auth_service: 'plex', image: plexUser.thumb })
        .where(eq(ctx.users.id, existingUser.id))
    }

    return toAuthUser({
      id: existingUser.id,
      username: existingUser.username,
      email: existingUser.email,
      groupName: existingUser.groupName,
      group_id: existingUser.group_id,
      image: plexUser.thumb,
    })
  }

  // Create new user
  const now = new Date()
  const newUser = {
    username: plexUser.username,
    password: '', // No password for Plex users
    email: plexUser.email,
    plex_token: plexToken,
    group_id: groupId,
    groupName: null, // Will be set by a trigger or post-processing
    locked: 0,
    image: plexUser.thumb,
    auth_service: 'plex',
    register_date: ctx.dialect === 'sqlite' ? now.toISOString() : now,
  }

  let insertedId: number

  if (ctx.dialect === 'sqlite') {
    ctx.db
      .insert(ctx.users)
      .values({ ...newUser, register_date: now.toISOString() })
      .run()
    insertedId = Number(
      ctx.db.select({ id: ctx.users.id }).from(ctx.users).orderBy(ctx.users.id).all().pop()?.id ?? 0
    )
  } else if (ctx.dialect === 'mysql') {
    const result = await ctx.db.insert(ctx.users).values({ ...newUser, register_date: now })
    insertedId = Number(result[0].insertId)
  } else {
    const result = await ctx.db
      .insert(ctx.users)
      .values({ ...newUser, register_date: now })
      .returning({ id: ctx.users.id })
    insertedId = result[0].id
  }

  // Fetch the group name
  let groupName: string | null = null
  if (ctx.dialect === 'sqlite') {
    const groupRows = ctx.db.select().from(ctx.groups).where(eq(ctx.groups.group_id, groupId)).all()
    if (groupRows.length > 0) {
      groupName = (groupRows[0] as { name: string | null }).name
    }
  } else if (ctx.dialect === 'mysql') {
    const groupRows = await ctx.db.select().from(ctx.groups).where(eq(ctx.groups.group_id, groupId))
    if (groupRows.length > 0) {
      groupName = (groupRows[0] as { name: string | null }).name
    }
  } else {
    const groupRows = await ctx.db.select().from(ctx.groups).where(eq(ctx.groups.group_id, groupId))
    if (groupRows.length > 0) {
      groupName = (groupRows[0] as { name: string | null }).name
    }
  }

  return toAuthUser({
    id: insertedId,
    username: plexUser.username,
    email: plexUser.email,
    groupName: groupName,
    group_id: groupId,
    image: plexUser.thumb,
  })
}

// ---------------------------------------------------------------------------
// Link Existing User to Plex
// ---------------------------------------------------------------------------

export async function linkPlexAccount(userId: number, plexToken: string): Promise<void> {
  const ctx = dialectCtx('users')

  // Verify the Plex token and get user info
  const plexUser = await verifyPlexToken(plexToken)

  if (ctx.dialect === 'sqlite') {
    ctx.db
      .update(ctx.users)
      .set({ plex_token: plexToken, auth_service: 'plex', image: plexUser.thumb })
      .where(eq(ctx.users.id, userId))
      .run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db
      .update(ctx.users)
      .set({ plex_token: plexToken, auth_service: 'plex', image: plexUser.thumb })
      .where(eq(ctx.users.id, userId))
  } else {
    await ctx.db
      .update(ctx.users)
      .set({ plex_token: plexToken, auth_service: 'plex', image: plexUser.thumb })
      .where(eq(ctx.users.id, userId))
  }
}
