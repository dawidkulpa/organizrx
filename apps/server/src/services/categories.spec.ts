import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  categoryHasTabs,
  getNextOrder,
} from './categories'

function uniqueDbPath(suffix = 'categories'): string {
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

  // Create categories and tabs tables
  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "order" INTEGER,
      category TEXT UNIQUE,
      category_id INTEGER,
      image TEXT,
      "default" INTEGER
    )
  `)

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS tabs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "order" INTEGER,
      category_id INTEGER,
      name TEXT,
      url TEXT,
      url_local TEXT,
      "default" INTEGER,
      enabled INTEGER,
      group_id INTEGER,
      group_id_max INTEGER DEFAULT 0,
      add_to_admin INTEGER DEFAULT 0,
      image TEXT,
      type INTEGER,
      splash INTEGER,
      ping INTEGER,
      ping_url TEXT,
      timeout INTEGER,
      timeout_ms INTEGER,
      preload INTEGER
    )
  `)

  return db
}

describe('categories service', () => {
  beforeEach(async () => {
    await closeDb()
  })

  afterEach(async () => {
    await closeDb()
  })

  // -------------------------------------------------------------------------
  // List categories
  // -------------------------------------------------------------------------

  describe('listCategories', () => {
    it('should return empty array when no categories exist', async () => {
      await setupDb()

      const result = await listCategories()

      expect(result).toEqual([])
    })

    it('should list all categories ordered by order field', async () => {
      const db = await setupDb()

      // Create categories with specific order
      db.$client.exec(`
        INSERT INTO categories (category, category_id, "order")
        VALUES ('Movies', 1, 2)
      `)
      db.$client.exec(`
        INSERT INTO categories (category, category_id, "order")
        VALUES ('TV Shows', 2, 1)
      `)
      db.$client.exec(`
        INSERT INTO categories (category, category_id, "order")
        VALUES ('Music', 3, 3)
      `)

      const result = await listCategories()

      expect(result).toHaveLength(3)
      expect(result[0].name).toBe('TV Shows')
      expect(result[0].order).toBe(1)
      expect(result[1].name).toBe('Movies')
      expect(result[1].order).toBe(2)
      expect(result[2].name).toBe('Music')
      expect(result[2].order).toBe(3)
    })
  })

  // -------------------------------------------------------------------------
  // Get category by ID
  // -------------------------------------------------------------------------

  describe('getCategoryById', () => {
    it('should return undefined for non-existent category', async () => {
      await setupDb()

      const result = await getCategoryById(999)

      expect(result).toBeNull()
    })

    it('should get category by ID with all fields', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO categories (category, category_id, "order", image, "default")
        VALUES ('Movies', 1, 1, 'movies.png', 1)
      `)

      const result = await getCategoryById(1)

      expect(result).toBeDefined()
      expect(result?.name).toBe('Movies')
      expect(result?.category_id).toBe(1)
      expect(result?.order).toBe(1)
      expect(result?.image).toBe('movies.png')
      expect(result?.isDefault).toBe(1)
    })
  })

  // -------------------------------------------------------------------------
  // Create category
  // -------------------------------------------------------------------------

  describe('createCategory', () => {
    it('should create a category with all fields', async () => {
      await setupDb()

      const result = await createCategory({
        name: 'Movies',
        category_id: 1,
        order: 1,
        image: 'movies.png',
        isDefault: 1,
      })

      expect(result.id).toBeDefined()
      expect(result.name).toBe('Movies')
      expect(result.category_id).toBe(1)
      expect(result.order).toBe(1)
      expect(result.image).toBe('movies.png')
      expect(result.isDefault).toBe(1)
    })

    it('should auto-assign next order if not provided', async () => {
      const db = await setupDb()

      // Create first category with order 1
      db.$client.exec(`
        INSERT INTO categories (category, category_id, "order")
        VALUES ('First', 1, 1)
      `)

      // Create second without specifying order
      const result = await createCategory({
        name: 'Second',
        category_id: 2,
      })

      expect(result.order).toBe(2)
    })

    it('should create category with null fields', async () => {
      await setupDb()

      const result = await createCategory({
        name: 'Movies',
        category_id: 1,
      })

      expect(result.name).toBe('Movies')
      expect(result.category_id).toBe(1)
      expect(result.image).toBeNull()
      expect(result.isDefault).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // Update category
  // -------------------------------------------------------------------------

  describe('updateCategory', () => {
    it('should update category fields', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO categories (category, category_id, "order")
        VALUES ('Movies', 1, 1)
      `)

      const updated = await updateCategory(1, {
        name: 'Films',
        order: 2,
        image: 'films.png',
      })

      expect(updated?.name).toBe('Films')
      expect(updated?.order).toBe(2)
      expect(updated?.image).toBe('films.png')
      expect(updated?.category_id).toBe(1) // unchanged
    })

    it('should return undefined for non-existent category', async () => {
      await setupDb()

      const result = await updateCategory(999, { name: 'Updated' })

      expect(result).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // Delete category
  // -------------------------------------------------------------------------

  describe('deleteCategory', () => {
    it('should delete a category', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO categories (category, category_id, "order")
        VALUES ('Movies', 1, 1)
      `)

      const deleted = await deleteCategory(1)

      expect(deleted).toBe(true)
      const result = await getCategoryById(1)
      expect(result).toBeNull()
    })

    it('should throw error when category has tabs', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO categories (category, category_id, "order")
        VALUES ('Movies', 1, 1)
      `)

      db.$client.exec(`
        INSERT INTO tabs (category_id, name, group_id)
        VALUES (1, 'TMDB', 4)
      `)

      expect(deleteCategory(1)).rejects.toThrow('Cannot delete category with existing tabs')
    })
  })

  // -------------------------------------------------------------------------
  // Category has tabs check
  // -------------------------------------------------------------------------

  describe('categoryHasTabs', () => {
    it('should return false when category has no tabs', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO categories (category, category_id, "order")
        VALUES ('Movies', 1, 1)
      `)

      const result = await categoryHasTabs(1)

      expect(result).toBe(false)
    })

    it('should return true when category has tabs', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO categories (category, category_id, "order")
        VALUES ('Movies', 1, 1)
      `)

      db.$client.exec(`
        INSERT INTO tabs (category_id, name, group_id)
        VALUES (1, 'TMDB', 4)
      `)

      const result = await categoryHasTabs(1)

      expect(result).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // Get next order
  // -------------------------------------------------------------------------

  describe('getNextOrder', () => {
    it('should return 1 when no categories exist', async () => {
      await setupDb()

      const result = await getNextOrder()

      expect(result).toBe(1)
    })

    it('should return max order + 1', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO categories (category, category_id, "order")
        VALUES ('First', 1, 1)
      `)
      db.$client.exec(`
        INSERT INTO categories (category, category_id, "order")
        VALUES ('Second', 2, 5)
      `)

      const result = await getNextOrder()

      expect(result).toBe(6)
    })
  })

  // -------------------------------------------------------------------------
  // Reorder categories
  // -------------------------------------------------------------------------

  describe('reorderCategories', () => {
    it('should reorder multiple categories', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO categories (category, category_id, "order")
        VALUES ('Movies', 1, 1)
      `)
      db.$client.exec(`
        INSERT INTO categories (category, category_id, "order")
        VALUES ('TV', 2, 2)
      `)
      db.$client.exec(`
        INSERT INTO categories (category, category_id, "order")
        VALUES ('Music', 3, 3)
      `)

      await reorderCategories([
        { id: 1, order: 3 },
        { id: 2, order: 1 },
        { id: 3, order: 2 },
      ])

      const all = await listCategories()

      expect(all[0].name).toBe('TV')
      expect(all[1].name).toBe('Music')
      expect(all[2].name).toBe('Movies')
    })
  })
})
