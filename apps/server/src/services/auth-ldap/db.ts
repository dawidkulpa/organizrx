import { eq } from 'drizzle-orm'

import { dialectCtx } from '../../db/dialect-ctx'
import { hashPassword, toAuthUser } from '../auth'
import { getGroupNameFromId, type LdapUserInfo } from './mapping'

import type { AuthUser } from '@organizrx/shared'

// ---------------------------------------------------------------------------
// Find or create local user for LDAP-authenticated user
// ---------------------------------------------------------------------------

export async function findOrCreateLdapUser(
  ldapUser: LdapUserInfo,
  groupId: number
): Promise<AuthUser> {
  const ctx = dialectCtx('users')

  // Try to find existing user by username
  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db.select().from(ctx.users).where(eq(ctx.users.username, ldapUser.username)).all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db.select().from(ctx.users).where(eq(ctx.users.username, ldapUser.username))
  } else {
    rows = await ctx.db.select().from(ctx.users).where(eq(ctx.users.username, ldapUser.username))
  }

  if (rows.length > 0) {
    const existing = rows[0] as {
      id: number
      username: string | null
      email: string | null
      groupName: string | null
      group_id: number | null
      image: string | null
    }
    return toAuthUser(existing)
  }

  // Create new user with random password hash (LDAP users never use local password)
  const randomPassword = crypto.randomUUID()
  const passwordHash = await hashPassword(randomPassword)

  const groupName = getGroupNameFromId(groupId)

  if (ctx.dialect === 'sqlite') {
    ctx.db
      .insert(ctx.users)
      .values({
        username: ldapUser.username,
        password: passwordHash,
        email: ldapUser.email,
        groupName: groupName,
        group_id: groupId,
        locked: 0,
        image: null,
        register_date: new Date().toISOString(),
        auth_service: 'ldap',
      })
      .run()

    // Re-fetch the created user
    const created = ctx.db
      .select()
      .from(ctx.users)
      .where(eq(ctx.users.username, ldapUser.username))
      .all()

    if (created.length === 0) {
      throw new Error('Failed to create LDAP user')
    }

    const user = created[0] as {
      id: number
      username: string | null
      email: string | null
      groupName: string | null
      group_id: number | null
      image: string | null
    }
    return toAuthUser(user)
  }

  // MySQL
  if (ctx.dialect === 'mysql') {
    await ctx.db.insert(ctx.users).values({
      username: ldapUser.username,
      password: passwordHash,
      email: ldapUser.email,
      groupName: groupName,
      group_id: groupId,
      locked: 0,
      image: null,
      register_date: new Date(),
      auth_service: 'ldap',
    })

    const createdRows = await ctx.db
      .select()
      .from(ctx.users)
      .where(eq(ctx.users.username, ldapUser.username))

    if (createdRows.length === 0) {
      throw new Error('Failed to create LDAP user')
    }

    const user = createdRows[0] as {
      id: number
      username: string | null
      email: string | null
      groupName: string | null
      group_id: number | null
      image: string | null
    }
    return toAuthUser(user)
  }

  // PostgreSQL
  await ctx.db.insert(ctx.users).values({
    username: ldapUser.username,
    password: passwordHash,
    email: ldapUser.email,
    groupName: groupName,
    group_id: groupId,
    locked: 0,
    image: null,
    register_date: new Date(),
    auth_service: 'ldap',
  })

  const createdRows = await ctx.db
    .select()
    .from(ctx.users)
    .where(eq(ctx.users.username, ldapUser.username))

  if (createdRows.length === 0) {
    throw new Error('Failed to create LDAP user')
  }

  const user = createdRows[0] as {
    id: number
    username: string | null
    email: string | null
    groupName: string | null
    group_id: number | null
    image: string | null
  }
  return toAuthUser(user)
}
