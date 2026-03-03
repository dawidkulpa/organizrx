import { eq, sql } from 'drizzle-orm'

import { getRawDb, getDialect, type SqliteDb, type MysqlDb, type PostgresDb } from '../db'
import * as sqliteSchema from '../db/schema/sqlite'
import * as mysqlSchema from '../db/schema/mysql'
import * as pgSchema from '../db/schema/pg'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface User {
  id: number
  username: string
  email: string | null
  groupName: string | null
  group_id: number | null
  locked: number | null
  image: string | null
  register_date: string | null
  auth_service: string | null
}

export interface CreateUserData {
  username: string
  password: string
  email?: string | null
  groupName?: string | null
  group_id?: number | null
  image?: string | null
}

export interface UpdateUserData {
  username?: string
  password?: string
  email?: string | null
  groupName?: string | null
  group_id?: number | null
  image?: string | null
  locked?: number | null
}

export interface ListUsersResult {
  users: User[]
  total: number
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

// ---------------------------------------------------------------------------
// User CRUD operations
// ---------------------------------------------------------------------------

export async function listUsers(page = 1, limit = 20): Promise<ListUsersResult> {
  const ctx = dialectCtx()
  const offset = (page - 1) * limit

  let rows: unknown[]
  let countRows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db.select({
      id: ctx.users.id,
      username: ctx.users.username,
      email: ctx.users.email,
      groupName: ctx.users.groupName,
      group_id: ctx.users.group_id,
      locked: ctx.users.locked,
      image: ctx.users.image,
      register_date: ctx.users.register_date,
      auth_service: ctx.users.auth_service,
    }).from(ctx.users).limit(limit).offset(offset).all()

    countRows = ctx.db.select({ count: sql<number>`count(*)` }).from(ctx.users).all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db.select({
      id: ctx.users.id,
      username: ctx.users.username,
      email: ctx.users.email,
      groupName: ctx.users.groupName,
      group_id: ctx.users.group_id,
      locked: ctx.users.locked,
      image: ctx.users.image,
      register_date: ctx.users.register_date,
      auth_service: ctx.users.auth_service,
    }).from(ctx.users).limit(limit).offset(offset)

    countRows = await ctx.db.select({ count: sql<number>`count(*)` }).from(ctx.users)
  } else {
    rows = await ctx.db.select({
      id: ctx.users.id,
      username: ctx.users.username,
      email: ctx.users.email,
      groupName: ctx.users.groupName,
      group_id: ctx.users.group_id,
      locked: ctx.users.locked,
      image: ctx.users.image,
      register_date: ctx.users.register_date,
      auth_service: ctx.users.auth_service,
    }).from(ctx.users).limit(limit).offset(offset)

    countRows = await ctx.db.select({ count: sql<number>`count(*)` }).from(ctx.users)
  }

  const users = (rows as unknown[]).map(row => {
    const r = row as {
      id: number
      username: string | null
      email: string | null
      groupName: string | null
      group_id: number | null
      locked: number | null
      image: string | null
      register_date: string | null
      auth_service: string | null
    }
    return {
      id: r.id,
      username: r.username ?? '',
      email: r.email,
      groupName: r.groupName,
      group_id: r.group_id,
      locked: r.locked,
      image: r.image,
      register_date: r.register_date,
      auth_service: r.auth_service,
    }
  })

  const total = countRows.length > 0 ? (countRows[0] as { count: number }).count : 0

  return { users, total }
}

export async function getUserById(id: number): Promise<User | null> {
  const ctx = dialectCtx()

  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db.select({
      id: ctx.users.id,
      username: ctx.users.username,
      email: ctx.users.email,
      groupName: ctx.users.groupName,
      group_id: ctx.users.group_id,
      locked: ctx.users.locked,
      image: ctx.users.image,
      register_date: ctx.users.register_date,
      auth_service: ctx.users.auth_service,
    }).from(ctx.users).where(eq(ctx.users.id, id)).all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db.select({
      id: ctx.users.id,
      username: ctx.users.username,
      email: ctx.users.email,
      groupName: ctx.users.groupName,
      group_id: ctx.users.group_id,
      locked: ctx.users.locked,
      image: ctx.users.image,
      register_date: ctx.users.register_date,
      auth_service: ctx.users.auth_service,
    }).from(ctx.users).where(eq(ctx.users.id, id))
  } else {
    rows = await ctx.db.select({
      id: ctx.users.id,
      username: ctx.users.username,
      email: ctx.users.email,
      groupName: ctx.users.groupName,
      group_id: ctx.users.group_id,
      locked: ctx.users.locked,
      image: ctx.users.image,
      register_date: ctx.users.register_date,
      auth_service: ctx.users.auth_service,
    }).from(ctx.users).where(eq(ctx.users.id, id))
  }

  if (rows.length === 0) return null

  const row = rows[0] as {
    id: number
    username: string | null
    email: string | null
    groupName: string | null
    group_id: number | null
    locked: number | null
    image: string | null
    register_date: string | null
    auth_service: string | null
  }

  return {
    id: row.id,
    username: row.username ?? '',
    email: row.email,
    groupName: row.groupName,
    group_id: row.group_id,
    locked: row.locked,
    image: row.image,
    register_date: row.register_date,
    auth_service: row.auth_service,
  }
}

export async function createUser(data: CreateUserData): Promise<User> {
  const ctx = dialectCtx()
  if (ctx.dialect === 'sqlite') {
    const result = ctx.db.insert(ctx.users).values({
      username: data.username,
      password: data.password,
      email: data.email ?? null,
      groupName: data.groupName ?? null,
      group_id: data.group_id ?? null,
      image: data.image ?? null,
      register_date: new Date().toISOString(),
      auth_service: 'internal',
      locked: 0,
    }).run()

    const userId = (result as unknown as { lastInsertRowid: number }).lastInsertRowid
    const user = await getUserById(userId)
    if (!user) throw new Error('Failed to retrieve created user')
    return user
  } else if (ctx.dialect === 'mysql') {
    const result = await ctx.db.insert(ctx.users).values({
      username: data.username,
      password: data.password,
      email: data.email ?? null,
      groupName: data.groupName ?? null,
      group_id: data.group_id ?? null,
      image: data.image ?? null,
      register_date: new Date(),
      auth_service: 'internal',
      locked: 0,
    })

    const userId = Number(result[0].insertId)
    const user = await getUserById(userId)
    if (!user) throw new Error('Failed to retrieve created user')
    return user
  } else {
    const rows = await ctx.db.insert(ctx.users).values({
      username: data.username,
      password: data.password,
      email: data.email ?? null,
      groupName: data.groupName ?? null,
      group_id: data.group_id ?? null,
      image: data.image ?? null,
      register_date: new Date(),
      auth_service: 'internal',
      locked: 0,
    }).returning({ id: ctx.users.id })

    const userId = (rows[0] as { id: number }).id
    const user = await getUserById(userId)
    if (!user) throw new Error('Failed to retrieve created user')
    return user
  }
}

export async function updateUser(id: number, data: UpdateUserData): Promise<User | null> {
  const ctx = dialectCtx()

  const updateData: Record<string, string | number | null> = {}
  if (data.username !== undefined) updateData.username = data.username
  if (data.password !== undefined) updateData.password = data.password
  if (data.email !== undefined) updateData.email = data.email
  if (data.groupName !== undefined) updateData.groupName = data.groupName
  if (data.group_id !== undefined) updateData.group_id = data.group_id
  if (data.image !== undefined) updateData.image = data.image
  if (data.locked !== undefined) updateData.locked = data.locked

  if (Object.keys(updateData).length === 0) {
    return getUserById(id)
  }

  if (ctx.dialect === 'sqlite') {
    ctx.db.update(ctx.users).set(updateData).where(eq(ctx.users.id, id)).run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db.update(ctx.users).set(updateData).where(eq(ctx.users.id, id))
  } else {
    await ctx.db.update(ctx.users).set(updateData).where(eq(ctx.users.id, id))
  }

  return getUserById(id)
}

export async function deleteUser(id: number): Promise<void> {
  const ctx = dialectCtx()

  if (ctx.dialect === 'sqlite') {
    ctx.db.delete(ctx.users).where(eq(ctx.users.id, id)).run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db.delete(ctx.users).where(eq(ctx.users.id, id))
  } else {
    await ctx.db.delete(ctx.users).where(eq(ctx.users.id, id))
  }
}

export async function changePassword(userId: number, newPasswordHash: string): Promise<void> {
  const ctx = dialectCtx()

  if (ctx.dialect === 'sqlite') {
    ctx.db.update(ctx.users).set({ password: newPasswordHash }).where(eq(ctx.users.id, userId)).run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db.update(ctx.users).set({ password: newPasswordHash }).where(eq(ctx.users.id, userId))
  } else {
    await ctx.db.update(ctx.users).set({ password: newPasswordHash }).where(eq(ctx.users.id, userId))
  }
}

export async function isUsernameTaken(username: string, excludeId?: number): Promise<boolean> {
  const ctx = dialectCtx()

  let rows: unknown[]

  if (excludeId !== undefined) {
    if (ctx.dialect === 'sqlite') {
      rows = ctx.db.select({ id: ctx.users.id })
        .from(ctx.users)
        .where(eq(ctx.users.username, username))
        .all()
    } else if (ctx.dialect === 'mysql') {
      rows = await ctx.db.select({ id: ctx.users.id })
        .from(ctx.users)
        .where(eq(ctx.users.username, username))
    } else {
      rows = await ctx.db.select({ id: ctx.users.id })
        .from(ctx.users)
        .where(eq(ctx.users.username, username))
    }

    return rows.some(r => (r as { id: number }).id !== excludeId)
  } else {
    if (ctx.dialect === 'sqlite') {
      rows = ctx.db.select({ id: ctx.users.id })
        .from(ctx.users)
        .where(eq(ctx.users.username, username))
        .all()
    } else if (ctx.dialect === 'mysql') {
      rows = await ctx.db.select({ id: ctx.users.id })
        .from(ctx.users)
        .where(eq(ctx.users.username, username))
    } else {
      rows = await ctx.db.select({ id: ctx.users.id })
        .from(ctx.users)
        .where(eq(ctx.users.username, username))
    }

    return rows.length > 0
  }
}
