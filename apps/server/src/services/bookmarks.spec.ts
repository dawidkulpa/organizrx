import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import {
  listBookmarkCategories,
  getBookmarkCategoryById,
  createBookmarkCategory,
  updateBookmarkCategory,
  deleteBookmarkCategory,
  reorderBookmarkCategories,
  bookmarkCategoryHasTabs,
  listBookmarkTabs,
  getBookmarkTabById,
  createBookmarkTab,
  updateBookmarkTab,
  deleteBookmarkTab,
  reorderBookmarkTabs,
} from './bookmarks'

function uniqueDbPath(suffix = 'bookmarks'): string {
  const dir = join(tmpdir(), 'organizrx-test-' + process.pid)
  mkdirSync(dir, { recursive: true })
  return join(dir, `test-${suffix}-${Date.now()}.db`)
}

async function setupDb() {
  _resetConfig()
  await initConfig()
  const dbPath = uniqueDbPath()
  await initDb({ dialect: 'sqlite', url: dbPath })

  const db = getRawDb() as SqliteDb

  // Create BOOKMARK-categories table
  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS "BOOKMARK-categories" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "order" INTEGER,
      category TEXT UNIQUE,
      category_id INTEGER,
      "default" INTEGER
    )
  `)

  // Create BOOKMARK-tabs table
  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS "BOOKMARK-tabs" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "order" INTEGER,
      category_id INTEGER,
      name TEXT,
      url TEXT,
      enabled INTEGER,
      group_id INTEGER,
      image TEXT,
      background_color TEXT,
      text_color TEXT
    )
  `)

  return db
}

describe('bookmarks service', () => {
  beforeEach(async () => {
    await closeDb()
  })

  afterEach(async () => {
    await closeDb()
  })

  // -------------------------------------------------------------------------
  // Bookmark Categories
  // -------------------------------------------------------------------------

  describe('bookmark categories', () => {
    it('should list all bookmark categories ordered by order', async () => {
      await setupDb()

      await createBookmarkCategory({ name: 'Work', category_id: 1, order: 2 })
      await createBookmarkCategory({ name: 'Personal', category_id: 2, order: 1 })
      await createBookmarkCategory({ name: 'Dev', category_id: 3, order: 3 })

      const categories = await listBookmarkCategories()

      expect(categories).toHaveLength(3)
      expect(categories[0].name).toBe('Personal')
      expect(categories[1].name).toBe('Work')
      expect(categories[2].name).toBe('Dev')
    })

    it('should get bookmark category by id', async () => {
      await setupDb()

      const created = await createBookmarkCategory({ name: 'Tech', category_id: 10, order: 1 })
      const fetched = await getBookmarkCategoryById(created.id)

      expect(fetched).not.toBeNull()
      expect(fetched?.name).toBe('Tech')
      expect(fetched?.category_id).toBe(10)
    })

    it('should return null for non-existent category', async () => {
      await setupDb()

      const result = await getBookmarkCategoryById(999)
      expect(result).toBeNull()
    })

    it('should create bookmark category', async () => {
      await setupDb()

      const created = await createBookmarkCategory({
        name: 'News',
        category_id: 5,
        order: 10,
        isDefault: 1,
      })

      expect(created.id).toBeGreaterThan(0)
      expect(created.name).toBe('News')
      expect(created.category_id).toBe(5)
      expect(created.order).toBe(10)
      expect(created.isDefault).toBe(1)
    })

    it('should update bookmark category', async () => {
      await setupDb()

      const created = await createBookmarkCategory({ name: 'Old', category_id: 1 })
      const updated = await updateBookmarkCategory(created.id, { name: 'New', order: 99 })

      expect(updated).not.toBeNull()
      expect(updated?.name).toBe('New')
      expect(updated?.order).toBe(99)
    })

    it('should delete bookmark category without tabs', async () => {
      await setupDb()

      const created = await createBookmarkCategory({ name: 'ToDelete', category_id: 99 })
      await deleteBookmarkCategory(created.id)

      const fetched = await getBookmarkCategoryById(created.id)
      expect(fetched).toBeNull()
    })

    it('should detect if category has tabs', async () => {
      await setupDb()

      const category = await createBookmarkCategory({ name: 'WithTabs', category_id: 20 })
      expect(await bookmarkCategoryHasTabs(category.id)).toBe(false)

      await createBookmarkTab({
        name: 'Tab1',
        url: 'https://example.com',
        category_id: category.id,
        group_id: 0,
      })

      expect(await bookmarkCategoryHasTabs(category.id)).toBe(true)
    })

    it('should reorder bookmark categories', async () => {
      await setupDb()

      const cat1 = await createBookmarkCategory({ name: 'A', category_id: 1, order: 1 })
      const cat2 = await createBookmarkCategory({ name: 'B', category_id: 2, order: 2 })
      const cat3 = await createBookmarkCategory({ name: 'C', category_id: 3, order: 3 })

      await reorderBookmarkCategories([
        { id: cat1.id, order: 3 },
        { id: cat2.id, order: 1 },
        { id: cat3.id, order: 2 },
      ])

      const categories = await listBookmarkCategories()
      expect(categories[0].name).toBe('B')
      expect(categories[1].name).toBe('C')
      expect(categories[2].name).toBe('A')
    })
  })

  // -------------------------------------------------------------------------
  // Bookmark Tabs
  // -------------------------------------------------------------------------

  describe('bookmark tabs', () => {
    it('should list all bookmark tabs for admin', async () => {
      await setupDb()

      const category = await createBookmarkCategory({ name: 'Cat1', category_id: 1 })

      await createBookmarkTab({
        name: 'Tab1',
        url: 'https://example1.com',
        category_id: category.id,
        group_id: 0,
      })
      await createBookmarkTab({
        name: 'Tab2',
        url: 'https://example2.com',
        category_id: category.id,
        group_id: 4,
      })

      const tabs = await listBookmarkTabs(0) // Admin
      expect(tabs).toHaveLength(2)
    })

    it('should filter tabs by user group', async () => {
      await setupDb()

      const category = await createBookmarkCategory({ name: 'Cat1', category_id: 1 })

      await createBookmarkTab({
        name: 'AdminTab',
        url: 'https://admin.com',
        category_id: category.id,
        group_id: 0,
        order: 1,
      })
      await createBookmarkTab({
        name: 'UserTab',
        url: 'https://user.com',
        category_id: category.id,
        group_id: 4,
        order: 2,
      })
      await createBookmarkTab({
        name: 'PowerUserTab',
        url: 'https://power.com',
        category_id: category.id,
        group_id: 3,
        order: 3,
      })

      // User with groupID = 4 should only see tabs with group_id >= 4
      const userTabs = await listBookmarkTabs(4)
      expect(userTabs).toHaveLength(1)
      expect(userTabs[0].name).toBe('UserTab')
    })

    it('should get bookmark tab by id', async () => {
      await setupDb()

      const category = await createBookmarkCategory({ name: 'Cat1', category_id: 1 })
      const created = await createBookmarkTab({
        name: 'MyTab',
        url: 'https://test.com',
        category_id: category.id,
        group_id: 0,
      })

      const fetched = await getBookmarkTabById(created.id)
      expect(fetched).not.toBeNull()
      expect(fetched?.name).toBe('MyTab')
    })

    it('should create bookmark tab with all fields', async () => {
      await setupDb()

      const category = await createBookmarkCategory({ name: 'Cat1', category_id: 1 })
      const created = await createBookmarkTab({
        name: 'FullTab',
        url: 'https://full.com',
        category_id: category.id,
        group_id: 2,
        order: 5,
        enabled: 1,
        image: 'icon.png',
        background_color: '#ffffff',
        text_color: '#000000',
      })

      expect(created.id).toBeGreaterThan(0)
      expect(created.name).toBe('FullTab')
      expect(created.url).toBe('https://full.com')
      expect(created.group_id).toBe(2)
      expect(created.order).toBe(5)
      expect(created.enabled).toBe(1)
      expect(created.image).toBe('icon.png')
      expect(created.background_color).toBe('#ffffff')
      expect(created.text_color).toBe('#000000')
    })

    it('should update bookmark tab', async () => {
      await setupDb()

      const category = await createBookmarkCategory({ name: 'Cat1', category_id: 1 })
      const created = await createBookmarkTab({
        name: 'OldName',
        url: 'https://old.com',
        category_id: category.id,
        group_id: 0,
      })

      const updated = await updateBookmarkTab(created.id, {
        name: 'NewName',
        url: 'https://new.com',
      })

      expect(updated).not.toBeNull()
      expect(updated?.name).toBe('NewName')
      expect(updated?.url).toBe('https://new.com')
    })

    it('should delete bookmark tab', async () => {
      await setupDb()

      const category = await createBookmarkCategory({ name: 'Cat1', category_id: 1 })
      const created = await createBookmarkTab({
        name: 'ToDelete',
        url: 'https://delete.com',
        category_id: category.id,
        group_id: 0,
      })

      await deleteBookmarkTab(created.id)

      const fetched = await getBookmarkTabById(created.id)
      expect(fetched).toBeNull()
    })

    it('should reorder bookmark tabs', async () => {
      await setupDb()

      const category = await createBookmarkCategory({ name: 'Cat1', category_id: 1 })

      const tab1 = await createBookmarkTab({
        name: 'Tab1',
        url: 'https://1.com',
        category_id: category.id,
        group_id: 0,
        order: 1,
      })
      const tab2 = await createBookmarkTab({
        name: 'Tab2',
        url: 'https://2.com',
        category_id: category.id,
        group_id: 0,
        order: 2,
      })
      const tab3 = await createBookmarkTab({
        name: 'Tab3',
        url: 'https://3.com',
        category_id: category.id,
        group_id: 0,
        order: 3,
      })

      await reorderBookmarkTabs([
        { id: tab1.id, order: 3 },
        { id: tab2.id, order: 1 },
        { id: tab3.id, order: 2 },
      ])

      const tabs = await listBookmarkTabs(0)
      expect(tabs[0].name).toBe('Tab2')
      expect(tabs[1].name).toBe('Tab3')
      expect(tabs[2].name).toBe('Tab1')
    })
  })
})
