import { eq, max } from 'drizzle-orm'

import { getRawDb, getDialect, type SqliteDb, type MysqlDb, type PostgresDb } from '../db'
import * as sqliteSchema from '../db/schema/sqlite'
import * as mysqlSchema from '../db/schema/mysql'
import * as pgSchema from '../db/schema/pg'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Category {
  id: number
  order: number | null
  category: string
  category_id: number | null
  image: string | null
  default: number | null
}

export interface CreateCategoryData {
  category: string
  category_id: number
  order?: number
  image?: string
  default?: number
}

export interface UpdateCategoryData {
  category?: string
  category_id?: number
  order?: number
  image?: string
  default?: number
}

// ---------------------------------------------------------------------------
// Dialect helpers
// ---------------------------------------------------------------------------

type DialectResult =
  | { db: SqliteDb; categories: typeof sqliteSchema.categories; tabs: typeof sqliteSchema.tabs; dialect: 'sqlite' }
  | { db: MysqlDb; categories: typeof mysqlSchema.categories; tabs: typeof mysqlSchema.tabs; dialect: 'mysql' }
  | { db: PostgresDb; categories: typeof pgSchema.categories; tabs: typeof pgSchema.tabs; dialect: 'postgresql' }

function dialectCtx(): DialectResult {
  const dialect = getDialect()
  const raw = getRawDb()
  switch (dialect) {
    case 'sqlite':
      return { db: raw as SqliteDb, categories: sqliteSchema.categories, tabs: sqliteSchema.tabs, dialect }
    case 'mysql':
      return { db: raw as MysqlDb, categories: mysqlSchema.categories, tabs: mysqlSchema.tabs, dialect }
    case 'postgresql':
      return { db: raw as PostgresDb, categories: pgSchema.categories, tabs: pgSchema.tabs, dialect }
    default:
      throw new Error(`Unsupported dialect: ${dialect}`)
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function listCategories(): Promise<Category[]> {
  const ctx = dialectCtx()

  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db.select().from(ctx.categories).orderBy(ctx.categories.order).all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db.select().from(ctx.categories).orderBy(ctx.categories.order)
  } else {
    rows = await ctx.db.select().from(ctx.categories).orderBy(ctx.categories.order)
  }

  return rows as Category[]
}

export async function getCategoryById(id: number): Promise<Category | null> {
  const ctx = dialectCtx()

  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db.select().from(ctx.categories).where(eq(ctx.categories.id, id)).all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db.select().from(ctx.categories).where(eq(ctx.categories.id, id))
  } else {
    rows = await ctx.db.select().from(ctx.categories).where(eq(ctx.categories.id, id))
  }

  if (rows.length === 0) return null

  return rows[0] as Category
}

export async function createCategory(data: CreateCategoryData): Promise<Category> {
  const ctx = dialectCtx()

  let order = data.order
  if (order === undefined) {
    order = await getNextOrder()
  }

  const insertData = {
    category: data.category,
    category_id: data.category_id,
    order,
    image: data.image ?? null,
    default: data.default ?? null,
  }

  if (ctx.dialect === 'sqlite') {
    const result = ctx.db.insert(ctx.categories).values(insertData).run()
    const id = result.lastInsertRowid as number
    const created = await getCategoryById(id)
    if (!created) throw new Error('Failed to retrieve created category')
    return created
  }

  if (ctx.dialect === 'mysql') {
    await ctx.db.insert(ctx.categories).values(insertData)
    // Find by unique constraint
    const rows = await ctx.db
      .select()
      .from(ctx.categories)
      .where(eq(ctx.categories.category, data.category))
      .limit(1)
    if (!rows[0]) throw new Error('Failed to retrieve created category')
    return rows[0] as Category
  }

  // PostgreSQL with .returning()
  const result = await ctx.db.insert(ctx.categories).values(insertData).returning()
  if (!result[0]) throw new Error('Failed to retrieve created category')
  return result[0] as Category
}

export async function updateCategory(id: number, data: UpdateCategoryData): Promise<Category | null> {
  const ctx = dialectCtx()

  const existing = await getCategoryById(id)
  if (!existing) return null

  const updates = {
    ...(data.category !== undefined && { category: data.category }),
    ...(data.category_id !== undefined && { category_id: data.category_id }),
    ...(data.order !== undefined && { order: data.order }),
    ...(data.image !== undefined && { image: data.image }),
    ...(data.default !== undefined && { default: data.default }),
  }

  if (ctx.dialect === 'sqlite') {
    ctx.db.update(ctx.categories).set(updates).where(eq(ctx.categories.id, id)).run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db.update(ctx.categories).set(updates).where(eq(ctx.categories.id, id))
  } else {
    await ctx.db.update(ctx.categories).set(updates).where(eq(ctx.categories.id, id))
  }

  return await getCategoryById(id)
}

export async function deleteCategory(id: number): Promise<boolean> {
  const ctx = dialectCtx()

  // Check if category has tabs
  const hasTabs = await categoryHasTabs(id)
  if (hasTabs) {
    throw new Error('Cannot delete category with existing tabs')
  }

  if (ctx.dialect === 'sqlite') {
    const result = ctx.db.delete(ctx.categories).where(eq(ctx.categories.id, id)).run()
    return result.changes > 0
  }

  if (ctx.dialect === 'mysql') {
    await ctx.db.delete(ctx.categories).where(eq(ctx.categories.id, id))
  } else {
    await ctx.db.delete(ctx.categories).where(eq(ctx.categories.id, id))
  }

  return true
}

export async function categoryHasTabs(categoryId: number): Promise<boolean> {
  const ctx = dialectCtx()

  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db
      .select()
      .from(ctx.tabs)
      .where(eq(ctx.tabs.category_id, categoryId))
      .limit(1)
      .all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db
      .select()
      .from(ctx.tabs)
      .where(eq(ctx.tabs.category_id, categoryId))
      .limit(1)
  } else {
    rows = await ctx.db
      .select()
      .from(ctx.tabs)
      .where(eq(ctx.tabs.category_id, categoryId))
      .limit(1)
  }

  return rows.length > 0
}

export async function getNextOrder(): Promise<number> {
  const ctx = dialectCtx()

  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db
      .select({ maxOrder: max(ctx.categories.order) })
      .from(ctx.categories)
      .all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db.select({ maxOrder: max(ctx.categories.order) }).from(ctx.categories)
  } else {
    rows = await ctx.db.select({ maxOrder: max(ctx.categories.order) }).from(ctx.categories)
  }

  const maxOrder = (rows[0] as { maxOrder: number | null })?.maxOrder ?? 0
  return maxOrder + 1
}

export async function reorderCategories(items: { id: number; order: number }[]): Promise<void> {
  const ctx = dialectCtx()

  if (ctx.dialect === 'sqlite') {
    for (const item of items) {
      ctx.db.update(ctx.categories).set({ order: item.order }).where(eq(ctx.categories.id, item.id)).run()
    }
    return
  }

  // MySQL/PostgreSQL: async
  for (const item of items) {
    if (ctx.dialect === 'mysql') {
      await ctx.db.update(ctx.categories).set({ order: item.order }).where(eq(ctx.categories.id, item.id))
    } else {
      await ctx.db.update(ctx.categories).set({ order: item.order }).where(eq(ctx.categories.id, item.id))
    }
  }
}
