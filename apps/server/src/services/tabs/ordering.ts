// ---------------------------------------------------------------------------
// Tab ordering, reorder, and permission-filtered retrieval
// ---------------------------------------------------------------------------

import { eq, gte, and } from 'drizzle-orm'

import { dialectCtx } from '../../db/dialect-ctx'
import type { Tab } from './crud'

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function listTabs(userGroupId?: number | null): Promise<Tab[]> {
  const ctx = dialectCtx('tabs')

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

export async function reorderTabs(items: { id: number; order: number }[]): Promise<void> {
  const ctx = dialectCtx('tabs')

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

export async function getTabsByCategory(
  categoryId: number,
  userGroupId?: number | null
): Promise<Tab[]> {
  const ctx = dialectCtx('tabs')

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
        .where(and(eq(ctx.tabs.category_id, categoryId), gte(ctx.tabs.group_id, userGroupId)))
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
        .where(and(eq(ctx.tabs.category_id, categoryId), gte(ctx.tabs.group_id, userGroupId)))
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
        .where(and(eq(ctx.tabs.category_id, categoryId), gte(ctx.tabs.group_id, userGroupId)))
        .orderBy(ctx.tabs.order)
    }
  }

  return rows as Tab[]
}
