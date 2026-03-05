// ---------------------------------------------------------------------------
// Database operations — linking/unlinking accounts, finding by external ID
// ---------------------------------------------------------------------------

import { eq, or } from 'drizzle-orm'

import { dialectCtx } from '../../db/dialect-ctx'
import { hashPassword, toAuthUser } from '../auth'
import type { OidcUserInfo } from './mapping'
import type { AuthUser } from '@organizrx/shared'

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface UserRow {
  id: number
  username: string | null
  password: string | null
  email: string | null
  groupName: string | null
  group_id: number | null
  locked: number | null
  image: string | null
  auth_service: string | null
}

// ---------------------------------------------------------------------------
// Find user by email or auth_service
// ---------------------------------------------------------------------------

async function findUserByEmailOrAuthService(
  email: string | null,
  oidcSub: string
): Promise<UserRow | null> {
  const ctx = dialectCtx('users')
  const authServiceValue = `oidc:${oidcSub}`

  let rows: unknown[]

  if (email) {
    if (ctx.dialect === 'sqlite') {
      rows = ctx.db
        .select()
        .from(ctx.users)
        .where(or(eq(ctx.users.email, email), eq(ctx.users.auth_service, authServiceValue)))
        .all()
    } else if (ctx.dialect === 'mysql') {
      rows = await ctx.db
        .select()
        .from(ctx.users)
        .where(or(eq(ctx.users.email, email), eq(ctx.users.auth_service, authServiceValue)))
    } else {
      rows = await ctx.db
        .select()
        .from(ctx.users)
        .where(or(eq(ctx.users.email, email), eq(ctx.users.auth_service, authServiceValue)))
    }
  } else {
    if (ctx.dialect === 'sqlite') {
      rows = ctx.db
        .select()
        .from(ctx.users)
        .where(eq(ctx.users.auth_service, authServiceValue))
        .all()
    } else if (ctx.dialect === 'mysql') {
      rows = await ctx.db
        .select()
        .from(ctx.users)
        .where(eq(ctx.users.auth_service, authServiceValue))
    } else {
      rows = await ctx.db
        .select()
        .from(ctx.users)
        .where(eq(ctx.users.auth_service, authServiceValue))
    }
  }

  if (rows.length === 0) return null
  return rows[0] as UserRow
}

// ---------------------------------------------------------------------------
// Find or create OIDC user
// ---------------------------------------------------------------------------

export async function findOrCreateOidcUser(
  oidcUser: OidcUserInfo,
  groupId: number,
  groupName: string,
  autoCreate: boolean
): Promise<AuthUser | null> {
  // Try to find existing user by auth_service or email
  const existing = await findUserByEmailOrAuthService(oidcUser.email, oidcUser.sub)

  if (existing) {
    // Update auth_service and group info
    await updateUserOidc(existing.id, oidcUser.sub, groupId, groupName)

    return toAuthUser({
      id: existing.id,
      username: existing.username,
      email: oidcUser.email ?? existing.email,
      groupName: groupName,
      group_id: groupId,
      image: oidcUser.picture ?? existing.image,
    })
  }

  if (!autoCreate) {
    return null
  }

  // Create new user
  const username = oidcUser.preferredUsername ?? oidcUser.name ?? oidcUser.sub
  const randomPassword = crypto.randomUUID()
  const hashedPassword = await hashPassword(randomPassword)

  const ctx = dialectCtx('users')
  const authServiceValue = `oidc:${oidcUser.sub}`
  const now = new Date()

  let userId: number

  if (ctx.dialect === 'sqlite') {
    const result = ctx.db
      .insert(ctx.users)
      .values({
        username,
        password: hashedPassword,
        email: oidcUser.email,
        groupName: groupName,
        group_id: groupId,
        image: oidcUser.picture ?? null,
        register_date: now.toISOString(),
        auth_service: authServiceValue,
        locked: 0,
      })
      .run()

    userId = Number((result as unknown as { lastInsertRowid: number }).lastInsertRowid)
  } else if (ctx.dialect === 'mysql') {
    const result = await ctx.db.insert(ctx.users).values({
      username,
      password: hashedPassword,
      email: oidcUser.email,
      groupName: groupName,
      group_id: groupId,
      image: oidcUser.picture ?? null,
      register_date: now,
      auth_service: authServiceValue,
      locked: 0,
    })

    userId = Number(result[0].insertId)
  } else {
    const result = await ctx.db
      .insert(ctx.users)
      .values({
        username,
        password: hashedPassword,
        email: oidcUser.email,
        groupName: groupName,
        group_id: groupId,
        image: oidcUser.picture ?? null,
        register_date: now,
        auth_service: authServiceValue,
        locked: 0,
      })
      .returning({ id: ctx.users.id })

    userId = (result[0] as { id: number }).id
  }

  return toAuthUser({
    id: userId,
    username,
    email: oidcUser.email,
    groupName: groupName,
    group_id: groupId,
    image: oidcUser.picture ?? null,
  })
}

// ---------------------------------------------------------------------------
// Link existing user to OIDC
// ---------------------------------------------------------------------------

export async function linkOidcAccount(userId: number, oidcSub: string): Promise<void> {
  const ctx = dialectCtx('users')
  const authServiceValue = `oidc:${oidcSub}`

  if (ctx.dialect === 'sqlite') {
    ctx.db
      .update(ctx.users)
      .set({ auth_service: authServiceValue })
      .where(eq(ctx.users.id, userId))
      .run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db
      .update(ctx.users)
      .set({ auth_service: authServiceValue })
      .where(eq(ctx.users.id, userId))
  } else {
    await ctx.db
      .update(ctx.users)
      .set({ auth_service: authServiceValue })
      .where(eq(ctx.users.id, userId))
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function updateUserOidc(
  userId: number,
  oidcSub: string,
  groupId: number,
  groupName: string
): Promise<void> {
  const ctx = dialectCtx('users')
  const authServiceValue = `oidc:${oidcSub}`

  const updates = {
    auth_service: authServiceValue,
    groupName: groupName,
    group_id: groupId,
  }

  if (ctx.dialect === 'sqlite') {
    ctx.db.update(ctx.users).set(updates).where(eq(ctx.users.id, userId)).run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db.update(ctx.users).set(updates).where(eq(ctx.users.id, userId))
  } else {
    await ctx.db.update(ctx.users).set(updates).where(eq(ctx.users.id, userId))
  }
}
