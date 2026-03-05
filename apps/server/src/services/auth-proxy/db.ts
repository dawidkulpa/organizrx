import { eq } from 'drizzle-orm'

import { dialectCtx } from '../../db/dialect-ctx'
import { createAccessToken, toAuthUser } from '../auth'
import { isTrustedProxy } from './ip'
import { getProxyAuthConfig, extractProxyUser } from './config'

// ---------------------------------------------------------------------------
// User Management
// ---------------------------------------------------------------------------

export async function findOrCreateProxyUser(opts: {
  username: string
  email: string | null
  groupId: number
}): Promise<{
  id: number
  username: string
  email: string | null
  groupName: string | null
  group_id: number | null
  image: string | null
}> {
  const ctx = dialectCtx('users')

  let rows: unknown[]
  if (ctx.dialect === 'sqlite') {
    rows = ctx.db.select().from(ctx.users).where(eq(ctx.users.username, opts.username)).all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db.select().from(ctx.users).where(eq(ctx.users.username, opts.username))
  } else {
    rows = await ctx.db.select().from(ctx.users).where(eq(ctx.users.username, opts.username))
  }

  if (rows.length > 0) {
    const row = rows[0] as {
      id: number
      username: string
      email: string | null
      groupName: string | null
      group_id: number | null
      image: string | null
    }
    return row
  }

  const now = new Date()

  if (ctx.dialect === 'sqlite') {
    const result = ctx.db
      .insert(ctx.users)
      .values({
        username: opts.username,
        email: opts.email,
        password: '',
        group_id: opts.groupId,
        auth_service: 'proxy',
        register_date: now.toISOString(),
        locked: 0,
      })
      .returning({
        id: ctx.users.id,
        username: ctx.users.username,
        email: ctx.users.email,
        groupName: ctx.users.groupName,
        group_id: ctx.users.group_id,
        image: ctx.users.image,
      })
      .get()

    return result as {
      id: number
      username: string
      email: string | null
      groupName: string | null
      group_id: number | null
      image: string | null
    }
  } else if (ctx.dialect === 'mysql') {
    await ctx.db.insert(ctx.users).values({
      username: opts.username,
      email: opts.email,
      password: '',
      group_id: opts.groupId,
      auth_service: 'proxy',
      register_date: now,
      locked: 0,
    })

    const fetchRows = await ctx.db
      .select()
      .from(ctx.users)
      .where(eq(ctx.users.username, opts.username))
    if (fetchRows.length === 0) {
      throw new Error('Failed to create proxy user')
    }

    return fetchRows[0] as {
      id: number
      username: string
      email: string | null
      groupName: string | null
      group_id: number | null
      image: string | null
    }
  } else {
    await ctx.db.insert(ctx.users).values({
      username: opts.username,
      email: opts.email,
      password: '',
      group_id: opts.groupId,
      auth_service: 'proxy',
      register_date: now,
      locked: 0,
    })

    const fetchRows = await ctx.db
      .select()
      .from(ctx.users)
      .where(eq(ctx.users.username, opts.username))
    if (fetchRows.length === 0) {
      throw new Error('Failed to create proxy user')
    }

    return fetchRows[0] as {
      id: number
      username: string
      email: string | null
      groupName: string | null
      group_id: number | null
      image: string | null
    }
  }
}

// ---------------------------------------------------------------------------
// Main Auth Flow
// ---------------------------------------------------------------------------

export async function authenticateProxyUser(
  clientIp: string,
  headers: Record<string, string | undefined>
): Promise<{ token: string } | null> {
  const config = await getProxyAuthConfig()

  if (!config.enabled) return null

  // Validate IP
  if (!isTrustedProxy(clientIp, config.whitelist)) {
    return null
  }

  // Extract headers
  const { username, email } = extractProxyUser(headers, config)
  if (!username) return null

  // Create or find user
  if (!config.autoCreate) {
    // Only allow existing users
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
  }

  const user = await findOrCreateProxyUser({
    username,
    email,
    groupId: config.defaultGroupId,
  })

  // Create access token
  const authUser = toAuthUser(user)
  const token = await createAccessToken(authUser)

  return { token }
}
