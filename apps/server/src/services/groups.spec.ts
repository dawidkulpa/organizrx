import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import {
  listGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  isDefaultGroup,
  groupHasUsers,
  userHasAccess,
} from './groups'

function uniqueDbPath(suffix = 'groups'): string {
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

  // Create tables manually via raw SQLite
  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "group" TEXT UNIQUE,
      group_id INTEGER,
      image TEXT,
      "default" INTEGER
    )
  `)

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      email TEXT,
      plex_token TEXT,
      "group" TEXT,
      group_id INTEGER,
      locked INTEGER,
      image TEXT,
      register_date TEXT,
      auth_service TEXT DEFAULT 'internal'
    )
  `)

  // Insert default groups
  db.$client.exec(`
    INSERT INTO groups ("group", group_id, image, "default") VALUES
      ('Admin', 0, 'plugins/images/groups/admin.png', 0),
      ('Co-Admin', 1, 'plugins/images/groups/coadmin.png', 0),
      ('Super User', 2, 'plugins/images/groups/superuser.png', 0),
      ('Power User', 3, 'plugins/images/groups/poweruser.png', 0),
      ('User', 4, 'plugins/images/groups/user.png', 1),
      ('Guest', 999, 'plugins/images/groups/guest.png', 0)
  `)

  return db
}

describe('groups service', () => {
  beforeEach(async () => {
    await closeDb()
  })

  afterEach(async () => {
    await closeDb()
  })

  // -------------------------------------------------------------------------
  // List groups
  // -------------------------------------------------------------------------

  describe('listGroups', () => {
    it('should return all groups ordered by group_id', async () => {
      await setupDb()
      const groups = await listGroups()

      expect(groups.length).toBe(6)
      expect(groups[0].name).toBe('Admin')
      expect(groups[0].group_id).toBe(0)
      expect(groups[5].name).toBe('Guest')
      expect(groups[5].group_id).toBe(999)
    })

    it('should return empty array when no groups exist', async () => {
      await setupDb()
      const db = getRawDb() as SqliteDb
      db.$client.exec('DELETE FROM groups')

      const groups = await listGroups()
      expect(groups.length).toBe(0)
    })
  })

  // -------------------------------------------------------------------------
  // Get group by ID
  // -------------------------------------------------------------------------

  describe('getGroupById', () => {
    it('should return a group by ID', async () => {
      await setupDb()
      const groups = await listGroups()
      const adminGroup = groups[0]

      const group = await getGroupById(adminGroup.id)

      expect(group).not.toBeNull()
      expect(group?.name).toBe('Admin')
      expect(group?.group_id).toBe(0)
    })

    it('should return null for non-existent group', async () => {
      await setupDb()
      const group = await getGroupById(9999)

      expect(group).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // Create group
  // -------------------------------------------------------------------------

  describe('createGroup', () => {
    it('should create a custom group with negative group_id', async () => {
      await setupDb()
      const created = await createGroup({
        name: 'Custom Admin',
        group_id: -1,
        image: 'custom.png',
        isDefault: 0,
      })

      expect(created.name).toBe('Custom Admin')
      expect(created.group_id).toBe(-1)
      expect(created.image).toBe('custom.png')
      expect(created.isDefault).toBe(0)
    })

    it('should throw error for invalid group_id range', async () => {
      await setupDb()

      expect(
        createGroup({
          name: 'Invalid',
          group_id: 5,
          image: undefined,
          isDefault: 0,
        })
      ).rejects.toThrow('Custom groups must have group_id <= 0 or >= 999')
    })

    it('should create group with default values', async () => {
      await setupDb()
      const created = await createGroup({
        name: 'Simple Group',
        group_id: -5,
      })

      expect(created.name).toBe('Simple Group')
      expect(created.image).toBeNull()
      expect(created.isDefault).toBe(0)
    })
  })

  // -------------------------------------------------------------------------
  // Update group
  // -------------------------------------------------------------------------

  describe('updateGroup', () => {
    it('should update group name and image', async () => {
      await setupDb()
      const customGroup = await createGroup({
        name: 'Original',
        group_id: -2,
      })

      const updated = await updateGroup(customGroup.id, {
        name: 'Updated',
        image: 'new-image.png',
      })

      expect(updated?.name).toBe('Updated')
      expect(updated?.image).toBe('new-image.png')
      expect(updated?.group_id).toBe(-2)
    })

    it('should return null for non-existent group', async () => {
      await setupDb()
      const updated = await updateGroup(9999, { name: 'Test' })

      expect(updated).toBeNull()
    })

    it('should throw error when changing group_id of default group', async () => {
      await setupDb()
      const groups = await listGroups()
      const userGroup = groups.find((g) => g.name === 'User')

      expect(
        updateGroup(userGroup!.id, { group_id: 10 })
      ).rejects.toThrow('Cannot change group_id of default groups')
    })
  })

  // -------------------------------------------------------------------------
  // Delete group
  // -------------------------------------------------------------------------

  describe('deleteGroup', () => {
    it('should delete a custom group', async () => {
      await setupDb()
      const created = await createGroup({
        name: 'To Delete',
        group_id: -10,
      })

      const deleted = await deleteGroup(created.id)
      expect(deleted).toBe(true)

      const found = await getGroupById(created.id)
      expect(found).toBeNull()
    })

    it('should return false for non-existent group', async () => {
      await setupDb()
      const deleted = await deleteGroup(9999)

      expect(deleted).toBe(false)
    })

    it('should throw error when deleting default group by default flag', async () => {
      await setupDb()
      const groups = await listGroups()
      const userGroup = groups.find((g) => g.isDefault === 1)

      expect(
        deleteGroup(userGroup!.id)
      ).rejects.toThrow('Cannot delete default groups')
    })

    it('should throw error when deleting default group by group_id', async () => {
      await setupDb()
      const groups = await listGroups()
      const adminGroup = groups.find((g) => g.group_id === 0)

      expect(
        deleteGroup(adminGroup!.id)
      ).rejects.toThrow('Cannot delete default groups')
    })

    it('should throw error when deleting group with users', async () => {
      await setupDb()
      const db = getRawDb() as SqliteDb

      const created = await createGroup({
        name: 'Has Users',
        group_id: -20,
      })

      // Add a user with this group_id
      db.$client.exec(`
        INSERT INTO users (username, password, group_id) 
        VALUES ('testuser', 'hash', ${created.group_id})
      `)

      expect(
        deleteGroup(created.id)
      ).rejects.toThrow('Cannot delete group that has users assigned to it')
    })
  })

  // -------------------------------------------------------------------------
  // Helper functions
  // -------------------------------------------------------------------------

  describe('isDefaultGroup', () => {
    it('should return true for default group IDs', () => {
      expect(isDefaultGroup(0)).toBe(true)
      expect(isDefaultGroup(1)).toBe(true)
      expect(isDefaultGroup(2)).toBe(true)
      expect(isDefaultGroup(3)).toBe(true)
      expect(isDefaultGroup(4)).toBe(true)
      expect(isDefaultGroup(999)).toBe(true)
    })

    it('should return false for custom group IDs', () => {
      expect(isDefaultGroup(-1)).toBe(false)
      expect(isDefaultGroup(5)).toBe(false)
      expect(isDefaultGroup(100)).toBe(false)
    })
  })

  describe('groupHasUsers', () => {
    it('should return true when group has users', async () => {
      await setupDb()
      const db = getRawDb() as SqliteDb

      db.$client.exec(`
        INSERT INTO users (username, password, group_id) 
        VALUES ('admin', 'hash', 0)
      `)

      const hasUsers = await groupHasUsers(0)
      expect(hasUsers).toBe(true)
    })

    it('should return false when group has no users', async () => {
      await setupDb()
      const hasUsers = await groupHasUsers(0)

      expect(hasUsers).toBe(false)
    })
  })

  describe('userHasAccess', () => {
    it('should allow admin (0) to access everything', () => {
      expect(userHasAccess(0, 0)).toBe(true)
      expect(userHasAccess(0, 1)).toBe(true)
      expect(userHasAccess(0, 999)).toBe(true)
    })

    it('should deny guest (999) from accessing privileged resources', () => {
      expect(userHasAccess(999, 0)).toBe(false)
      expect(userHasAccess(999, 1)).toBe(false)
      expect(userHasAccess(999, 4)).toBe(false)
      expect(userHasAccess(999, 999)).toBe(true)
    })

    it('should enforce hierarchy correctly', () => {
      expect(userHasAccess(1, 0)).toBe(false)
      expect(userHasAccess(1, 1)).toBe(true)
      expect(userHasAccess(1, 4)).toBe(true)
      expect(userHasAccess(4, 4)).toBe(true)
      expect(userHasAccess(4, 3)).toBe(false)
    })

    it('should return false for null group_id', () => {
      expect(userHasAccess(null, 0)).toBe(false)
      expect(userHasAccess(null, 999)).toBe(false)
    })
  })
})
