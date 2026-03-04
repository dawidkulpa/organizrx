import { eq, gte, and, max } from 'drizzle-orm'

import { getRawDb, getDialect, type SqliteDb, type MysqlDb, type PostgresDb } from '../db'
import * as sqliteSchema from '../db/schema/sqlite'
import * as mysqlSchema from '../db/schema/mysql'
import * as pgSchema from '../db/schema/pg'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Tab {
  id: number
  order: number | null
  category_id: number | null
  name: string | null
  url: string | null
  url_local: string | null
  isDefault: number | null
  enabled: number | null
  group_id: number | null
  group_id_max: number
  add_to_admin: number
  image: string | null
  type: number | null
  splash: number | null
  ping: number | null
  ping_url: string | null
  timeout: number | null
  timeout_ms: number | null
  preload: number | null
}

export interface CreateTabData {
  name: string
  category_id: number | null
  group_id: number
  url?: string
  url_local?: string
  order?: number
  enabled?: number
  isDefault?: number
  add_to_admin?: number
  image?: string
  type?: number
  splash?: number
  ping?: number
  ping_url?: string
  timeout?: number
  timeout_ms?: number
  preload?: number
  group_id_max?: number
}

export interface UpdateTabData {
  name?: string
  category_id?: number | null
  group_id?: number
  url?: string
  url_local?: string
  order?: number
  enabled?: number
  isDefault?: number
  add_to_admin?: number
  image?: string
  type?: number
  splash?: number
  ping?: number
  ping_url?: string
  timeout?: number
  timeout_ms?: number
  preload?: number
  group_id_max?: number
}

// ---------------------------------------------------------------------------
// Dialect helpers
// ---------------------------------------------------------------------------

type DialectResult =
  | { db: SqliteDb; tabs: typeof sqliteSchema.tabs; dialect: 'sqlite' }
  | { db: MysqlDb; tabs: typeof mysqlSchema.tabs; dialect: 'mysql' }
  | { db: PostgresDb; tabs: typeof pgSchema.tabs; dialect: 'postgresql' }

function dialectCtx(): DialectResult {
  const dialect = getDialect()
  const raw = getRawDb()
  switch (dialect) {
    case 'sqlite':
      return { db: raw as SqliteDb, tabs: sqliteSchema.tabs, dialect }
    case 'mysql':
      return { db: raw as MysqlDb, tabs: mysqlSchema.tabs, dialect }
    case 'postgresql':
      return { db: raw as PostgresDb, tabs: pgSchema.tabs, dialect }
    default:
      throw new Error(`Unsupported dialect: ${dialect}`)
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function listTabs(userGroupId?: number | null): Promise<Tab[]> {
  const ctx = dialectCtx()

  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    if (userGroupId === null || userGroupId === undefined || userGroupId === 0) {
      // Admin sees all
      rows = ctx.db.select().from(ctx.tabs).orderBy(ctx.tabs.order).all()
    } else {
      // Filter by group: show tabs where group_id >= userGroupId (lower = more privileged)
      rows = ctx.db
        .select()
        .from(ctx.tabs)
        .where(gte(ctx.tabs.group_id, userGroupId))
        .orderBy(ctx.tabs.order)
        .all()
    }
  } else if (ctx.dialect === 'mysql') {
    if (userGroupId === null || userGroupId === undefined || userGroupId === 0) {
      rows = await ctx.db.select().from(ctx.tabs).orderBy(ctx.tabs.order)
    } else {
      rows = await ctx.db
        .select()
        .from(ctx.tabs)
        .where(gte(ctx.tabs.group_id, userGroupId))
        .orderBy(ctx.tabs.order)
    }
  } else {
    if (userGroupId === null || userGroupId === undefined || userGroupId === 0) {
      rows = await ctx.db.select().from(ctx.tabs).orderBy(ctx.tabs.order)
    } else {
      rows = await ctx.db
        .select()
        .from(ctx.tabs)
        .where(gte(ctx.tabs.group_id, userGroupId))
        .orderBy(ctx.tabs.order)
    }
  }

  return rows as Tab[]
}

export async function getTabById(id: number): Promise<Tab | null> {
  const ctx = dialectCtx()

  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db.select().from(ctx.tabs).where(eq(ctx.tabs.id, id)).all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db.select().from(ctx.tabs).where(eq(ctx.tabs.id, id))
  } else {
    rows = await ctx.db.select().from(ctx.tabs).where(eq(ctx.tabs.id, id))
  }

  if (rows.length === 0) return null

  return rows[0] as Tab
}

export async function createTab(data: CreateTabData): Promise<Tab> {
  const ctx = dialectCtx()

  let order = data.order
  if (order === undefined) {
    order = await getNextTabOrder(data.category_id)
  }

  const insertData = {
    name: data.name,
    category_id: data.category_id,
    group_id: data.group_id,
    order,
    url: data.url ?? null,
    url_local: data.url_local ?? null,
    enabled: data.enabled ?? null,
    isDefault: data.isDefault ?? null,
    add_to_admin: data.add_to_admin ?? 0,
    image: data.image ?? null,
    type: data.type ?? null,
    splash: data.splash ?? null,
    ping: data.ping ?? null,
    ping_url: data.ping_url ?? null,
    timeout: data.timeout ?? null,
    timeout_ms: data.timeout_ms ?? null,
    preload: data.preload ?? null,
    group_id_max: data.group_id_max ?? 0,
  }

  if (ctx.dialect === 'sqlite') {
    const rows = ctx.db.insert(ctx.tabs).values(insertData).returning().all()
    if (!rows[0]) throw new Error('Failed to retrieve created tab')
    return rows[0] as Tab
  }

  if (ctx.dialect === 'mysql') {
    const result = await ctx.db.insert(ctx.tabs).values(insertData)
    const id = Number(result[0].insertId)
    const created = await getTabById(id)
    if (!created) throw new Error('Failed to retrieve created tab')
    return created
  }

  // PostgreSQL with .returning()
  const result = await ctx.db.insert(ctx.tabs).values(insertData).returning()
  if (!result[0]) throw new Error('Failed to retrieve created tab')
  return result[0] as Tab
}

export async function updateTab(id: number, data: UpdateTabData): Promise<Tab | null> {
  const ctx = dialectCtx()

  const existing = await getTabById(id)
  if (!existing) return null

  const updates = {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.category_id !== undefined && { category_id: data.category_id }),
    ...(data.group_id !== undefined && { group_id: data.group_id }),
    ...(data.url !== undefined && { url: data.url }),
    ...(data.url_local !== undefined && { url_local: data.url_local }),
    ...(data.order !== undefined && { order: data.order }),
    ...(data.enabled !== undefined && { enabled: data.enabled }),
    ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
    ...(data.add_to_admin !== undefined && { add_to_admin: data.add_to_admin }),
    ...(data.image !== undefined && { image: data.image }),
    ...(data.type !== undefined && { type: data.type }),
    ...(data.splash !== undefined && { splash: data.splash }),
    ...(data.ping !== undefined && { ping: data.ping }),
    ...(data.ping_url !== undefined && { ping_url: data.ping_url }),
    ...(data.timeout !== undefined && { timeout: data.timeout }),
    ...(data.timeout_ms !== undefined && { timeout_ms: data.timeout_ms }),
    ...(data.preload !== undefined && { preload: data.preload }),
    ...(data.group_id_max !== undefined && { group_id_max: data.group_id_max }),
  }

  if (ctx.dialect === 'sqlite') {
    ctx.db.update(ctx.tabs).set(updates).where(eq(ctx.tabs.id, id)).run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db.update(ctx.tabs).set(updates).where(eq(ctx.tabs.id, id))
  } else {
    await ctx.db.update(ctx.tabs).set(updates).where(eq(ctx.tabs.id, id))
  }

  return await getTabById(id)
}

export async function deleteTab(id: number): Promise<boolean> {
  const ctx = dialectCtx()

  if (ctx.dialect === 'sqlite') {
    ctx.db.delete(ctx.tabs).where(eq(ctx.tabs.id, id)).run()
    return true
  }

  if (ctx.dialect === 'mysql') {
    await ctx.db.delete(ctx.tabs).where(eq(ctx.tabs.id, id))
  } else {
    await ctx.db.delete(ctx.tabs).where(eq(ctx.tabs.id, id))
  }

  return true
}

export async function getNextTabOrder(categoryId?: number | null): Promise<number> {
  const ctx = dialectCtx()

  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    if (categoryId !== undefined && categoryId !== null) {
      rows = ctx.db
        .select({ maxOrder: max(ctx.tabs.order) })
        .from(ctx.tabs)
        .where(eq(ctx.tabs.category_id, categoryId))
        .all()
    } else {
      rows = ctx.db
        .select({ maxOrder: max(ctx.tabs.order) })
        .from(ctx.tabs)
        .all()
    }
  } else if (ctx.dialect === 'mysql') {
    if (categoryId !== undefined && categoryId !== null) {
      rows = await ctx.db
        .select({ maxOrder: max(ctx.tabs.order) })
        .from(ctx.tabs)
        .where(eq(ctx.tabs.category_id, categoryId))
    } else {
      rows = await ctx.db.select({ maxOrder: max(ctx.tabs.order) }).from(ctx.tabs)
    }
  } else {
    if (categoryId !== undefined && categoryId !== null) {
      rows = await ctx.db
        .select({ maxOrder: max(ctx.tabs.order) })
        .from(ctx.tabs)
        .where(eq(ctx.tabs.category_id, categoryId))
    } else {
      rows = await ctx.db.select({ maxOrder: max(ctx.tabs.order) }).from(ctx.tabs)
    }
  }

  const maxOrder = (rows[0] as { maxOrder: number | null })?.maxOrder ?? 0
  return maxOrder + 1
}

export async function reorderTabs(items: { id: number; order: number }[]): Promise<void> {
  const ctx = dialectCtx()

  if (ctx.dialect === 'sqlite') {
    for (const item of items) {
      ctx.db.update(ctx.tabs).set({ order: item.order }).where(eq(ctx.tabs.id, item.id)).run()
    }
    return
  }

  // MySQL/PostgreSQL: async
  for (const item of items) {
    if (ctx.dialect === 'mysql') {
      await ctx.db.update(ctx.tabs).set({ order: item.order }).where(eq(ctx.tabs.id, item.id))
    } else {
      await ctx.db.update(ctx.tabs).set({ order: item.order }).where(eq(ctx.tabs.id, item.id))
    }
  }
}

export async function getTabsByCategory(categoryId: number, userGroupId?: number | null): Promise<Tab[]> {
  const ctx = dialectCtx()

  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    if (userGroupId === null || userGroupId === undefined || userGroupId === 0) {
      // Admin sees all tabs in category
      rows = ctx.db
        .select()
        .from(ctx.tabs)
        .where(eq(ctx.tabs.category_id, categoryId))
        .orderBy(ctx.tabs.order)
        .all()
    } else {
      // Filter by category and group
      rows = ctx.db
        .select()
        .from(ctx.tabs)
        .where(
          and(
            eq(ctx.tabs.category_id, categoryId),
            gte(ctx.tabs.group_id, userGroupId)
          )
        )
        .orderBy(ctx.tabs.order)
        .all()
    }
  } else if (ctx.dialect === 'mysql') {
    if (userGroupId === null || userGroupId === undefined || userGroupId === 0) {
      rows = await ctx.db
        .select()
        .from(ctx.tabs)
        .where(eq(ctx.tabs.category_id, categoryId))
        .orderBy(ctx.tabs.order)
    } else {
      rows = await ctx.db
        .select()
        .from(ctx.tabs)
        .where(
          and(
            eq(ctx.tabs.category_id, categoryId),
            gte(ctx.tabs.group_id, userGroupId)
          )
        )
        .orderBy(ctx.tabs.order)
    }
  } else {
    if (userGroupId === null || userGroupId === undefined || userGroupId === 0) {
      rows = await ctx.db
        .select()
        .from(ctx.tabs)
        .where(eq(ctx.tabs.category_id, categoryId))
        .orderBy(ctx.tabs.order)
    } else {
      rows = await ctx.db
        .select()
        .from(ctx.tabs)
        .where(
          and(
            eq(ctx.tabs.category_id, categoryId),
            gte(ctx.tabs.group_id, userGroupId)
          )
        )
        .orderBy(ctx.tabs.order)
    }
  }

  return rows as Tab[]
}
