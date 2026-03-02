import { eq, and, gte } from 'drizzle-orm'

import { getRawDb, getDialect, type SqliteDb, type MysqlDb, type PostgresDb } from '../db'
import * as sqliteSchema from '../db/schema/sqlite'
import * as mysqlSchema from '../db/schema/mysql'
import * as pgSchema from '../db/schema/pg'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BookmarkCategory = {
  id: number
  order: number | null
  category: string | null
  category_id: number | null
  default: number | null
}

type BookmarkTab = {
  id: number
  order: number | null
  category_id: number | null
  name: string | null
  url: string | null
  enabled: number | null
  group_id: number | null
  image: string | null
  background_color: string | null
  text_color: string | null
}

// ---------------------------------------------------------------------------
// Dialect helpers
// ---------------------------------------------------------------------------

type DialectResult =
  | {
      db: SqliteDb
      bookmarkCategories: typeof sqliteSchema.bookmarkCategories
      bookmarkTabs: typeof sqliteSchema.bookmarkTabs
      dialect: 'sqlite'
    }
  | {
      db: MysqlDb
      bookmarkCategories: typeof mysqlSchema.bookmarkCategories
      bookmarkTabs: typeof mysqlSchema.bookmarkTabs
      dialect: 'mysql'
    }
  | {
      db: PostgresDb
      bookmarkCategories: typeof pgSchema.bookmarkCategories
      bookmarkTabs: typeof pgSchema.bookmarkTabs
      dialect: 'postgresql'
    }

function dialectCtx(): DialectResult {
  const dialect = getDialect()
  const raw = getRawDb()
  switch (dialect) {
    case 'sqlite':
      return {
        db: raw as SqliteDb,
        bookmarkCategories: sqliteSchema.bookmarkCategories,
        bookmarkTabs: sqliteSchema.bookmarkTabs,
        dialect,
      }
    case 'mysql':
      return {
        db: raw as MysqlDb,
        bookmarkCategories: mysqlSchema.bookmarkCategories,
        bookmarkTabs: mysqlSchema.bookmarkTabs,
        dialect,
      }
    case 'postgresql':
      return {
        db: raw as PostgresDb,
        bookmarkCategories: pgSchema.bookmarkCategories,
        bookmarkTabs: pgSchema.bookmarkTabs,
        dialect,
      }
    default:
      throw new Error(`Unsupported dialect: ${dialect}`)
  }
}

// ---------------------------------------------------------------------------
// Bookmark Categories
// ---------------------------------------------------------------------------

export async function listBookmarkCategories(): Promise<BookmarkCategory[]> {
  const ctx = dialectCtx()

  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db
      .select()
      .from(ctx.bookmarkCategories)
      .orderBy(ctx.bookmarkCategories.order)
      .all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db
      .select()
      .from(ctx.bookmarkCategories)
      .orderBy(ctx.bookmarkCategories.order)
  } else {
    rows = await ctx.db
      .select()
      .from(ctx.bookmarkCategories)
      .orderBy(ctx.bookmarkCategories.order)
  }

  return rows as BookmarkCategory[]
}

export async function getBookmarkCategoryById(id: number): Promise<BookmarkCategory | null> {
  const ctx = dialectCtx()

  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db
      .select()
      .from(ctx.bookmarkCategories)
      .where(eq(ctx.bookmarkCategories.id, id))
      .all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db
      .select()
      .from(ctx.bookmarkCategories)
      .where(eq(ctx.bookmarkCategories.id, id))
  } else {
    rows = await ctx.db
      .select()
      .from(ctx.bookmarkCategories)
      .where(eq(ctx.bookmarkCategories.id, id))
  }

  if (rows.length === 0) return null
  return rows[0] as BookmarkCategory
}

export async function createBookmarkCategory(data: {
  category: string
  category_id: number
  order?: number
  default?: number
}): Promise<BookmarkCategory> {
  const ctx = dialectCtx()

  if (ctx.dialect === 'sqlite') {
    const result = ctx.db.insert(ctx.bookmarkCategories).values({
      category: data.category,
      category_id: data.category_id,
      order: data.order ?? null,
      default: data.default ?? null,
    }).run()

    const id = Number(result.lastInsertRowid)
    const created = await getBookmarkCategoryById(id)
    if (!created) throw new Error('Failed to retrieve created bookmark category')
    return created
  } else if (ctx.dialect === 'mysql') {
    const result = await ctx.db.insert(ctx.bookmarkCategories).values({
      category: data.category,
      category_id: data.category_id,
      order: data.order ?? null,
      default: data.default ?? null,
    })

    const id = Number(result.insertId)
    const created = await getBookmarkCategoryById(id)
    if (!created) throw new Error('Failed to retrieve created bookmark category')
    return created
  } else {
    const result = await ctx.db.insert(ctx.bookmarkCategories).values({
      category: data.category,
      category_id: data.category_id,
      order: data.order ?? null,
      default: data.default ?? null,
    }).returning()

    return result[0] as BookmarkCategory
  }
}

export async function updateBookmarkCategory(
  id: number,
  data: Partial<{
    category: string
    category_id: number
    order: number
    default: number
  }>
): Promise<BookmarkCategory | null> {
  const ctx = dialectCtx()

  if (ctx.dialect === 'sqlite') {
    ctx.db
      .update(ctx.bookmarkCategories)
      .set(data)
      .where(eq(ctx.bookmarkCategories.id, id))
      .run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db
      .update(ctx.bookmarkCategories)
      .set(data)
      .where(eq(ctx.bookmarkCategories.id, id))
  } else {
    await ctx.db
      .update(ctx.bookmarkCategories)
      .set(data)
      .where(eq(ctx.bookmarkCategories.id, id))
  }

  return getBookmarkCategoryById(id)
}

export async function deleteBookmarkCategory(id: number): Promise<void> {
  const ctx = dialectCtx()

  if (ctx.dialect === 'sqlite') {
    ctx.db.delete(ctx.bookmarkCategories).where(eq(ctx.bookmarkCategories.id, id)).run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db.delete(ctx.bookmarkCategories).where(eq(ctx.bookmarkCategories.id, id))
  } else {
    await ctx.db.delete(ctx.bookmarkCategories).where(eq(ctx.bookmarkCategories.id, id))
  }
}

export async function reorderBookmarkCategories(
  items: Array<{ id: number; order: number }>
): Promise<void> {
  const ctx = dialectCtx()

  for (const item of items) {
    if (ctx.dialect === 'sqlite') {
      ctx.db
        .update(ctx.bookmarkCategories)
        .set({ order: item.order })
        .where(eq(ctx.bookmarkCategories.id, item.id))
        .run()
    } else if (ctx.dialect === 'mysql') {
      await ctx.db
        .update(ctx.bookmarkCategories)
        .set({ order: item.order })
        .where(eq(ctx.bookmarkCategories.id, item.id))
    } else {
      await ctx.db
        .update(ctx.bookmarkCategories)
        .set({ order: item.order })
        .where(eq(ctx.bookmarkCategories.id, item.id))
    }
  }
}

export async function bookmarkCategoryHasTabs(categoryId: number): Promise<boolean> {
  const ctx = dialectCtx()

  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db
      .select()
      .from(ctx.bookmarkTabs)
      .where(eq(ctx.bookmarkTabs.category_id, categoryId))
      .all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db
      .select()
      .from(ctx.bookmarkTabs)
      .where(eq(ctx.bookmarkTabs.category_id, categoryId))
  } else {
    rows = await ctx.db
      .select()
      .from(ctx.bookmarkTabs)
      .where(eq(ctx.bookmarkTabs.category_id, categoryId))
  }

  return rows.length > 0
}

// ---------------------------------------------------------------------------
// Bookmark Tabs
// ---------------------------------------------------------------------------

export async function listBookmarkTabs(userGroupId?: number | null): Promise<BookmarkTab[]> {
  const ctx = dialectCtx()

  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    if (userGroupId === null || userGroupId === undefined || userGroupId === 0) {
      // Admin sees all
      rows = ctx.db
        .select()
        .from(ctx.bookmarkTabs)
        .orderBy(ctx.bookmarkTabs.order)
        .all()
    } else {
      // Filter by group: show tabs where group_id >= userGroupId (lower = more privileged)
      rows = ctx.db
        .select()
        .from(ctx.bookmarkTabs)
        .where(gte(ctx.bookmarkTabs.group_id, userGroupId))
        .orderBy(ctx.bookmarkTabs.order)
        .all()
    }
  } else if (ctx.dialect === 'mysql') {
    if (userGroupId === null || userGroupId === undefined || userGroupId === 0) {
      rows = await ctx.db
        .select()
        .from(ctx.bookmarkTabs)
        .orderBy(ctx.bookmarkTabs.order)
    } else {
      rows = await ctx.db
        .select()
        .from(ctx.bookmarkTabs)
        .where(gte(ctx.bookmarkTabs.group_id, userGroupId))
        .orderBy(ctx.bookmarkTabs.order)
    }
  } else {
    if (userGroupId === null || userGroupId === undefined || userGroupId === 0) {
      rows = await ctx.db
        .select()
        .from(ctx.bookmarkTabs)
        .orderBy(ctx.bookmarkTabs.order)
    } else {
      rows = await ctx.db
        .select()
        .from(ctx.bookmarkTabs)
        .where(gte(ctx.bookmarkTabs.group_id, userGroupId))
        .orderBy(ctx.bookmarkTabs.order)
    }
  }

  return rows as BookmarkTab[]
}

export async function getBookmarkTabById(id: number): Promise<BookmarkTab | null> {
  const ctx = dialectCtx()

  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db
      .select()
      .from(ctx.bookmarkTabs)
      .where(eq(ctx.bookmarkTabs.id, id))
      .all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db
      .select()
      .from(ctx.bookmarkTabs)
      .where(eq(ctx.bookmarkTabs.id, id))
  } else {
    rows = await ctx.db
      .select()
      .from(ctx.bookmarkTabs)
      .where(eq(ctx.bookmarkTabs.id, id))
  }

  if (rows.length === 0) return null
  return rows[0] as BookmarkTab
}

export async function createBookmarkTab(data: {
  name: string
  url: string
  category_id: number
  group_id: number
  order?: number
  enabled?: number
  image?: string
  background_color?: string
  text_color?: string
}): Promise<BookmarkTab> {
  const ctx = dialectCtx()

  if (ctx.dialect === 'sqlite') {
    const result = ctx.db.insert(ctx.bookmarkTabs).values({
      name: data.name,
      url: data.url,
      category_id: data.category_id,
      group_id: data.group_id,
      order: data.order ?? null,
      enabled: data.enabled ?? null,
      image: data.image ?? null,
      background_color: data.background_color ?? null,
      text_color: data.text_color ?? null,
    }).run()

    const id = Number(result.lastInsertRowid)
    const created = await getBookmarkTabById(id)
    if (!created) throw new Error('Failed to retrieve created bookmark tab')
    return created
  } else if (ctx.dialect === 'mysql') {
    const result = await ctx.db.insert(ctx.bookmarkTabs).values({
      name: data.name,
      url: data.url,
      category_id: data.category_id,
      group_id: data.group_id,
      order: data.order ?? null,
      enabled: data.enabled ?? null,
      image: data.image ?? null,
      background_color: data.background_color ?? null,
      text_color: data.text_color ?? null,
    })

    const id = Number(result.insertId)
    const created = await getBookmarkTabById(id)
    if (!created) throw new Error('Failed to retrieve created bookmark tab')
    return created
  } else {
    const result = await ctx.db.insert(ctx.bookmarkTabs).values({
      name: data.name,
      url: data.url,
      category_id: data.category_id,
      group_id: data.group_id,
      order: data.order ?? null,
      enabled: data.enabled ?? null,
      image: data.image ?? null,
      background_color: data.background_color ?? null,
      text_color: data.text_color ?? null,
    }).returning()

    return result[0] as BookmarkTab
  }
}

export async function updateBookmarkTab(
  id: number,
  data: Partial<{
    name: string
    url: string
    category_id: number
    group_id: number
    order: number
    enabled: number
    image: string
    background_color: string
    text_color: string
  }>
): Promise<BookmarkTab | null> {
  const ctx = dialectCtx()

  if (ctx.dialect === 'sqlite') {
    ctx.db
      .update(ctx.bookmarkTabs)
      .set(data)
      .where(eq(ctx.bookmarkTabs.id, id))
      .run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db
      .update(ctx.bookmarkTabs)
      .set(data)
      .where(eq(ctx.bookmarkTabs.id, id))
  } else {
    await ctx.db
      .update(ctx.bookmarkTabs)
      .set(data)
      .where(eq(ctx.bookmarkTabs.id, id))
  }

  return getBookmarkTabById(id)
}

export async function deleteBookmarkTab(id: number): Promise<void> {
  const ctx = dialectCtx()

  if (ctx.dialect === 'sqlite') {
    ctx.db.delete(ctx.bookmarkTabs).where(eq(ctx.bookmarkTabs.id, id)).run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db.delete(ctx.bookmarkTabs).where(eq(ctx.bookmarkTabs.id, id))
  } else {
    await ctx.db.delete(ctx.bookmarkTabs).where(eq(ctx.bookmarkTabs.id, id))
  }
}

export async function reorderBookmarkTabs(
  items: Array<{ id: number; order: number }>
): Promise<void> {
  const ctx = dialectCtx()

  for (const item of items) {
    if (ctx.dialect === 'sqlite') {
      ctx.db
        .update(ctx.bookmarkTabs)
        .set({ order: item.order })
        .where(eq(ctx.bookmarkTabs.id, item.id))
        .run()
    } else if (ctx.dialect === 'mysql') {
      await ctx.db
        .update(ctx.bookmarkTabs)
        .set({ order: item.order })
        .where(eq(ctx.bookmarkTabs.id, item.id))
    } else {
      await ctx.db
        .update(ctx.bookmarkTabs)
        .set({ order: item.order })
        .where(eq(ctx.bookmarkTabs.id, item.id))
    }
  }
}
