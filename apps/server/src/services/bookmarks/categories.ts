import { eq } from 'drizzle-orm'

import { dialectCtx } from '../../db/dialect-ctx'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BookmarkCategory = {
  id: number
  order: number | null
  name: string | null
  category_id: number | null
  isDefault: number | null
}

// ---------------------------------------------------------------------------
// Bookmark Category CRUD
// ---------------------------------------------------------------------------

export async function listBookmarkCategories(): Promise<BookmarkCategory[]> {
  const ctx = dialectCtx('bookmarkCategories')

  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db.select().from(ctx.bookmarkCategories).orderBy(ctx.bookmarkCategories.order).all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db.select().from(ctx.bookmarkCategories).orderBy(ctx.bookmarkCategories.order)
  } else {
    rows = await ctx.db.select().from(ctx.bookmarkCategories).orderBy(ctx.bookmarkCategories.order)
  }

  return rows as BookmarkCategory[]
}

export async function getBookmarkCategoryById(id: number): Promise<BookmarkCategory | null> {
  const ctx = dialectCtx('bookmarkCategories')

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
  name: string
  category_id: number
  order?: number
  isDefault?: number
}): Promise<BookmarkCategory> {
  const ctx = dialectCtx('bookmarkCategories')

  if (ctx.dialect === 'sqlite') {
    const rows = ctx.db
      .insert(ctx.bookmarkCategories)
      .values({
        name: data.name,
        category_id: data.category_id,
        order: data.order ?? null,
        isDefault: data.isDefault ?? null,
      })
      .returning()
      .all()
    if (!rows[0]) throw new Error('Failed to retrieve created bookmark category')
    return rows[0] as BookmarkCategory
  } else if (ctx.dialect === 'mysql') {
    const result = await ctx.db.insert(ctx.bookmarkCategories).values({
      name: data.name,
      category_id: data.category_id,
      order: data.order ?? null,
      isDefault: data.isDefault ?? null,
    })

    const id = Number(result[0].insertId)
    const created = await getBookmarkCategoryById(id)
    if (!created) throw new Error('Failed to retrieve created bookmark category')
    return created
  } else {
    const result = await ctx.db
      .insert(ctx.bookmarkCategories)
      .values({
        name: data.name,
        category_id: data.category_id,
        order: data.order ?? null,
        isDefault: data.isDefault ?? null,
      })
      .returning()

    return result[0] as BookmarkCategory
  }
}

export async function updateBookmarkCategory(
  id: number,
  data: Partial<{
    name: string
    category_id: number
    order: number
    isDefault: number
  }>
): Promise<BookmarkCategory | null> {
  const ctx = dialectCtx('bookmarkCategories')

  if (ctx.dialect === 'sqlite') {
    ctx.db.update(ctx.bookmarkCategories).set(data).where(eq(ctx.bookmarkCategories.id, id)).run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db.update(ctx.bookmarkCategories).set(data).where(eq(ctx.bookmarkCategories.id, id))
  } else {
    await ctx.db.update(ctx.bookmarkCategories).set(data).where(eq(ctx.bookmarkCategories.id, id))
  }

  return getBookmarkCategoryById(id)
}

export async function deleteBookmarkCategory(id: number): Promise<void> {
  const ctx = dialectCtx('bookmarkCategories')

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
  const ctx = dialectCtx('bookmarkCategories')

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
