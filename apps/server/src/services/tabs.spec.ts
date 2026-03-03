import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import {
  listTabs,
  getTabById,
  createTab,
  updateTab,
  deleteTab,
  reorderTabs,
  getNextTabOrder,
  getTabsByCategory,
} from './tabs'

function uniqueDbPath(suffix = 'tabs'): string {
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

  // Create categories table
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

  // Create tabs table
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

describe('tabs service', () => {
  beforeEach(async () => {
    await closeDb()
  })

  afterEach(async () => {
    await closeDb()
  })

  // -------------------------------------------------------------------------
  // List tabs
  // -------------------------------------------------------------------------

  describe('listTabs', () => {
    it('should return empty array when no tabs exist', async () => {
      await setupDb()

      const result = await listTabs()

      expect(result).toEqual([])
    })

    it('should list all tabs for admin (group_id 0)', async () => {
      const db = await setupDb()

      // Create tabs with different group_id values
      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, "order")
        VALUES ('Admin Tab', 1, 0, 1)
      `)
      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, "order")
        VALUES ('User Tab', 1, 4, 2)
      `)

      const result = await listTabs(0)

      expect(result).toHaveLength(2)
    })

    it('should filter tabs by group_id for non-admin users', async () => {
      const db = await setupDb()

      // Create tabs: group_id 0 (admin), 2, 4, 6
      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, "order")
        VALUES ('Admin Tab', 1, 0, 1)
      `)
      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, "order")
        VALUES ('Power User Tab', 1, 2, 2)
      `)
      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, "order")
        VALUES ('User Tab', 1, 4, 3)
      `)
      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, "order")
        VALUES ('Guest Tab', 1, 6, 4)
      `)

      // User with group_id 4 should see tabs with group_id >= 4
      const result = await listTabs(4)

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('User Tab')
      expect(result[1].name).toBe('Guest Tab')
    })

    it('should list tabs ordered by order field', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, "order")
        VALUES ('Third Tab', 1, 4, 3)
      `)
      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, "order")
        VALUES ('First Tab', 1, 4, 1)
      `)
      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, "order")
        VALUES ('Second Tab', 1, 4, 2)
      `)

      const result = await listTabs()

      expect(result).toHaveLength(3)
      expect(result[0].name).toBe('First Tab')
      expect(result[1].name).toBe('Second Tab')
      expect(result[2].name).toBe('Third Tab')
    })
  })

  // -------------------------------------------------------------------------
  // Get tab by ID
  // -------------------------------------------------------------------------

  describe('getTabById', () => {
    it('should return null for non-existent tab', async () => {
      await setupDb()

      const result = await getTabById(999)

      expect(result).toBeNull()
    })

    it('should get tab by ID with all fields', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, url, url_local, "order", enabled, "default", image, type, splash, ping, ping_url, timeout, timeout_ms, preload, group_id_max, add_to_admin)
        VALUES ('Plex', 1, 4, 'https://plex.tv', 'http://localhost:32400', 1, 1, 0, 'plex.png', 1, 0, 1, 'https://plex.tv/ping', 30, 30000, 1, 0, 1)
      `)

      const result = await getTabById(1)

      expect(result).toBeDefined()
      expect(result?.name).toBe('Plex')
      expect(result?.category_id).toBe(1)
      expect(result?.group_id).toBe(4)
      expect(result?.url).toBe('https://plex.tv')
      expect(result?.url_local).toBe('http://localhost:32400')
      expect(result?.order).toBe(1)
      expect(result?.enabled).toBe(1)
      expect(result?.isDefault).toBe(0)
      expect(result?.image).toBe('plex.png')
      expect(result?.type).toBe(1)
      expect(result?.splash).toBe(0)
      expect(result?.ping).toBe(1)
      expect(result?.ping_url).toBe('https://plex.tv/ping')
      expect(result?.timeout).toBe(30)
      expect(result?.timeout_ms).toBe(30000)
      expect(result?.preload).toBe(1)
      expect(result?.group_id_max).toBe(0)
      expect(result?.add_to_admin).toBe(1)
    })
  })

  // -------------------------------------------------------------------------
  // Create tab
  // -------------------------------------------------------------------------

  describe('createTab', () => {
    it('should create a tab with all fields', async () => {
      await setupDb()

      const result = await createTab({
        name: 'Plex',
        category_id: 1,
        group_id: 4,
        url: 'https://plex.tv',
        url_local: 'http://localhost:32400',
        order: 1,
        enabled: 1,
        isDefault: 0,
        image: 'plex.png',
        type: 1,
        splash: 0,
        ping: 1,
        ping_url: 'https://plex.tv/ping',
        timeout: 30,
        timeout_ms: 30000,
        preload: 1,
        group_id_max: 0,
        add_to_admin: 1,
      })

      expect(result.id).toBeDefined()
      expect(result.name).toBe('Plex')
      expect(result.category_id).toBe(1)
      expect(result.group_id).toBe(4)
      expect(result.url).toBe('https://plex.tv')
      expect(result.order).toBe(1)
    })

    it('should auto-assign next order if not provided', async () => {
      const db = await setupDb()

      // Create first tab with order 1
      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, "order")
        VALUES ('First Tab', 1, 4, 1)
      `)

      // Create second without specifying order
      const result = await createTab({
        name: 'Second Tab',
        category_id: 1,
        group_id: 4,
      })

      expect(result.order).toBe(2)
    })

    it('should create tab with null optional fields', async () => {
      await setupDb()

      const result = await createTab({
        name: 'Basic Tab',
        category_id: 1,
        group_id: 4,
      })

      expect(result.name).toBe('Basic Tab')
      expect(result.category_id).toBe(1)
      expect(result.group_id).toBe(4)
      expect(result.url).toBeNull()
      expect(result.url_local).toBeNull()
      expect(result.image).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // Update tab
  // -------------------------------------------------------------------------

  describe('updateTab', () => {
    it('should update tab fields', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, "order")
        VALUES ('Old Name', 1, 4, 1)
      `)

      const updated = await updateTab(1, {
        name: 'New Name',
        url: 'https://example.com',
        order: 2,
      })

      expect(updated?.name).toBe('New Name')
      expect(updated?.url).toBe('https://example.com')
      expect(updated?.order).toBe(2)
      expect(updated?.category_id).toBe(1) // unchanged
    })

    it('should return null for non-existent tab', async () => {
      await setupDb()

      const result = await updateTab(999, { name: 'Updated' })

      expect(result).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // Delete tab
  // -------------------------------------------------------------------------

  describe('deleteTab', () => {
    it('should delete a tab', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, "order")
        VALUES ('Tab to Delete', 1, 4, 1)
      `)

      const deleted = await deleteTab(1)

      expect(deleted).toBe(true)
      const result = await getTabById(1)
      expect(result).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // Get next tab order
  // -------------------------------------------------------------------------

  describe('getNextTabOrder', () => {
    it('should return 1 when no tabs exist', async () => {
      await setupDb()

      const result = await getNextTabOrder()

      expect(result).toBe(1)
    })

    it('should return max order + 1 for all tabs', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, "order")
        VALUES ('First Tab', 1, 4, 1)
      `)
      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, "order")
        VALUES ('Second Tab', 1, 4, 5)
      `)

      const result = await getNextTabOrder()

      expect(result).toBe(6)
    })

    it('should return max order + 1 for specific category', async () => {
      const db = await setupDb()

      // Category 1 tabs
      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, "order")
        VALUES ('Cat1 Tab1', 1, 4, 1)
      `)
      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, "order")
        VALUES ('Cat1 Tab2', 1, 4, 3)
      `)

      // Category 2 tabs
      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, "order")
        VALUES ('Cat2 Tab1', 2, 4, 10)
      `)

      const result = await getNextTabOrder(1)

      expect(result).toBe(4)
    })
  })

  // -------------------------------------------------------------------------
  // Reorder tabs
  // -------------------------------------------------------------------------

  describe('reorderTabs', () => {
    it('should reorder multiple tabs', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, "order")
        VALUES ('Tab A', 1, 4, 1)
      `)
      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, "order")
        VALUES ('Tab B', 1, 4, 2)
      `)
      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, "order")
        VALUES ('Tab C', 1, 4, 3)
      `)

      await reorderTabs([
        { id: 1, order: 3 },
        { id: 2, order: 1 },
        { id: 3, order: 2 },
      ])

      const all = await listTabs()

      expect(all[0].name).toBe('Tab B')
      expect(all[1].name).toBe('Tab C')
      expect(all[2].name).toBe('Tab A')
    })
  })

  // -------------------------------------------------------------------------
  // Get tabs by category
  // -------------------------------------------------------------------------

  describe('getTabsByCategory', () => {
    it('should return tabs for specific category', async () => {
      const db = await setupDb()

      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, "order")
        VALUES ('Cat1 Tab', 1, 4, 1)
      `)
      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, "order")
        VALUES ('Cat2 Tab', 2, 4, 1)
      `)

      const result = await getTabsByCategory(1)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Cat1 Tab')
    })

    it('should filter by category and group_id', async () => {
      const db = await setupDb()

      // Category 1 tabs with different group_id
      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, "order")
        VALUES ('Cat1 Admin Tab', 1, 0, 1)
      `)
      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, "order")
        VALUES ('Cat1 Power User Tab', 1, 2, 2)
      `)
      db.$client.exec(`
        INSERT INTO tabs (name, category_id, group_id, "order")
        VALUES ('Cat1 User Tab', 1, 4, 3)
      `)

      // User with group_id 4 should only see tabs with group_id >= 4
      const result = await getTabsByCategory(1, 4)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Cat1 User Tab')
    })
  })
})
