import { eq } from 'drizzle-orm'

import { getRawDb, getDialect, type SqliteDb, type MysqlDb, type PostgresDb } from '../db'
import * as sqliteSchema from '../db/schema/sqlite'
import * as mysqlSchema from '../db/schema/mysql'
import * as pgSchema from '../db/schema/pg'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Group {
  id: number
  name: string
  group_id: number
  image: string | null
  isDefault: number
}

export interface CreateGroupData {
  name: string
  group_id: number
  image?: string
  isDefault?: number
}

export interface UpdateGroupData {
  name?: string
  group_id?: number
  image?: string
  isDefault?: number
}

// ---------------------------------------------------------------------------
// Dialect helpers
// ---------------------------------------------------------------------------

type DialectResult =
  | {
      db: SqliteDb
      groups: typeof sqliteSchema.groups
      users: typeof sqliteSchema.users
      dialect: 'sqlite'
    }
  | {
      db: MysqlDb
      groups: typeof mysqlSchema.groups
      users: typeof mysqlSchema.users
      dialect: 'mysql'
    }
  | {
      db: PostgresDb
      groups: typeof pgSchema.groups
      users: typeof pgSchema.users
      dialect: 'postgresql'
    }

function dialectCtx(): DialectResult {
  const dialect = getDialect()
  const raw = getRawDb()
  switch (dialect) {
    case 'sqlite':
      return {
        db: raw as SqliteDb,
        groups: sqliteSchema.groups,
        users: sqliteSchema.users,
        dialect,
      }
    case 'mysql':
      return { db: raw as MysqlDb, groups: mysqlSchema.groups, users: mysqlSchema.users, dialect }
    case 'postgresql':
      return { db: raw as PostgresDb, groups: pgSchema.groups, users: pgSchema.users, dialect }
    default:
      throw new Error(`Unsupported dialect: ${dialect}`)
  }
}

// ---------------------------------------------------------------------------
// Default group checks
// ---------------------------------------------------------------------------

const DEFAULT_GROUP_IDS = [0, 4, 999]

export function isDefaultGroup(groupId: number): boolean {
  return DEFAULT_GROUP_IDS.includes(groupId)
}

// ---------------------------------------------------------------------------
// Group CRUD operations
// ---------------------------------------------------------------------------

export async function listGroups(): Promise<Group[]> {
  const ctx = dialectCtx()

  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db.select().from(ctx.groups).orderBy(ctx.groups.group_id).all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db.select().from(ctx.groups).orderBy(ctx.groups.group_id)
  } else {
    rows = await ctx.db.select().from(ctx.groups).orderBy(ctx.groups.group_id)
  }

  return rows as Group[]
}

export async function getGroupById(id: number): Promise<Group | null> {
  const ctx = dialectCtx()

  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db.select().from(ctx.groups).where(eq(ctx.groups.id, id)).all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db.select().from(ctx.groups).where(eq(ctx.groups.id, id))
  } else {
    rows = await ctx.db.select().from(ctx.groups).where(eq(ctx.groups.id, id))
  }

  if (rows.length === 0) return null

  return rows[0] as Group
}

export async function createGroup(data: CreateGroupData): Promise<Group> {
  const ctx = dialectCtx()

  // Validate: group_id should be <= 0 for custom groups (non-default)
  if (data.group_id > 0 && data.group_id < 999) {
    throw new Error('Custom groups must have group_id <= 0 or >= 999')
  }

  const values = {
    name: data.name,
    group_id: data.group_id,
    image: data.image ?? null,
    isDefault: data.isDefault ?? 0,
  }

  let insertedId: number

  if (ctx.dialect === 'sqlite') {
    const rows = ctx.db.insert(ctx.groups).values(values).returning().all()
    insertedId = rows[0].id
  } else if (ctx.dialect === 'mysql') {
    const result = await ctx.db.insert(ctx.groups).values(values)
    insertedId = Number(result[0].insertId)
  } else {
    const result = await ctx.db.insert(ctx.groups).values(values).returning({ id: ctx.groups.id })
    insertedId = result[0].id
  }

  const created = await getGroupById(insertedId)
  if (!created) throw new Error('Failed to retrieve created group')
  return created
}

export async function updateGroup(id: number, data: UpdateGroupData): Promise<Group | null> {
  const ctx = dialectCtx()

  // Check if group exists
  const existing = await getGroupById(id)
  if (!existing) return null

  // Cannot change group_id of default groups
  if (data.group_id !== undefined && existing.isDefault === 1) {
    throw new Error('Cannot change group_id of default groups')
  }

  if (ctx.dialect === 'sqlite') {
    ctx.db.update(ctx.groups).set(data).where(eq(ctx.groups.id, id)).run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db.update(ctx.groups).set(data).where(eq(ctx.groups.id, id))
  } else {
    await ctx.db.update(ctx.groups).set(data).where(eq(ctx.groups.id, id))
  }

  return getGroupById(id)
}

export async function deleteGroup(id: number): Promise<boolean> {
  const ctx = dialectCtx()

  const group = await getGroupById(id)
  if (!group) return false

  // Cannot delete default groups
  if (group.isDefault === 1 || isDefaultGroup(group.group_id)) {
    throw new Error('Cannot delete default groups')
  }

  // Cannot delete group that has users
  const hasUsers = await groupHasUsers(group.group_id)
  if (hasUsers) {
    throw new Error('Cannot delete group that has users assigned to it')
  }

  if (ctx.dialect === 'sqlite') {
    ctx.db.delete(ctx.groups).where(eq(ctx.groups.id, id)).run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db.delete(ctx.groups).where(eq(ctx.groups.id, id))
  } else {
    await ctx.db.delete(ctx.groups).where(eq(ctx.groups.id, id))
  }

  return true
}

// ---------------------------------------------------------------------------
// User association checks
// ---------------------------------------------------------------------------

export async function groupHasUsers(groupId: number): Promise<boolean> {
  const ctx = dialectCtx()

  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db
      .select({ id: ctx.users.id })
      .from(ctx.users)
      .where(eq(ctx.users.group_id, groupId))
      .all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db
      .select({ id: ctx.users.id })
      .from(ctx.users)
      .where(eq(ctx.users.group_id, groupId))
  } else {
    rows = await ctx.db
      .select({ id: ctx.users.id })
      .from(ctx.users)
      .where(eq(ctx.users.group_id, groupId))
  }

  return rows.length > 0
}

// ---------------------------------------------------------------------------
// Authorization helper
// ---------------------------------------------------------------------------

/**
 * Check if user has access based on group hierarchy.
 * Lower group_id = more privileged.
 * Admin (0) can access everything, Guest (999) can access nothing.
 */
export function userHasAccess(userGroupId: number | null, requiredGroupId: number): boolean {
  if (userGroupId === null) return false
  return userGroupId <= requiredGroupId
}
