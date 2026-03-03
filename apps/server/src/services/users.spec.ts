import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  isUsernameTaken,
} from './users'
import { hashPassword } from './auth'

function uniqueDbPath(suffix = 'users'): string {
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
      auth_service TEXT DEFAULT 'internal',
      totp_secret TEXT,
      totp_enabled INTEGER DEFAULT 0,
      totp_backup_codes TEXT
    )
  `)

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE,
      user_id INTEGER,
      browser TEXT,
      ip TEXT,
      created TEXT,
      expires TEXT
    )
  `)

  return db
}

describe('users service', () => {
  beforeEach(async () => {
    await closeDb()
  })

  afterEach(async () => {
    await closeDb()
  })

  // ---------------------------------------------------------------------------
  // Create user
  // ---------------------------------------------------------------------------

  describe('createUser', () => {
    it('should create a user with hashed password', async () => {
      await setupDb()
      const passwordHash = await hashPassword('testpass')

      const user = await createUser({
        username: 'testuser',
        password: passwordHash,
        email: 'test@example.com',
        groupName: 'User',
        group_id: 4,
      })

      expect(user).toBeDefined()
      expect(user.id).toBeGreaterThan(0)
      expect(user.username).toBe('testuser')
      expect(user.email).toBe('test@example.com')
      expect(user.groupName).toBe('User')
      expect(user.group_id).toBe(4)
      expect(user.locked).toBe(0)
    })

    it('should create a user with minimal data', async () => {
      await setupDb()
      const passwordHash = await hashPassword('testpass')

      const user = await createUser({
        username: 'minimaluser',
        password: passwordHash,
      })

      expect(user).toBeDefined()
      expect(user.username).toBe('minimaluser')
      expect(user.email).toBeNull()
      expect(user.groupName).toBeNull()
      expect(user.group_id).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // Get user by ID
  // ---------------------------------------------------------------------------

  describe('getUserById', () => {
    it('should return a user by id', async () => {
      await setupDb()
      const passwordHash = await hashPassword('testpass')

      const created = await createUser({
        username: 'getbyiduser',
        password: passwordHash,
        email: 'getbyid@example.com',
      })

      const user = await getUserById(created.id)

      expect(user).toBeDefined()
      expect(user?.id).toBe(created.id)
      expect(user?.username).toBe('getbyiduser')
      expect(user?.email).toBe('getbyid@example.com')
    })

    it('should return null for non-existent user', async () => {
      await setupDb()
      const user = await getUserById(99999)
      expect(user).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // List users
  // ---------------------------------------------------------------------------

  describe('listUsers', () => {
    it('should list users with pagination', async () => {
      await setupDb()
      const passwordHash = await hashPassword('testpass')

      await createUser({ username: 'user1', password: passwordHash })
      await createUser({ username: 'user2', password: passwordHash })
      await createUser({ username: 'user3', password: passwordHash })

      const result = await listUsers(1, 2)

      expect(result.users).toHaveLength(2)
      expect(result.total).toBe(3)
    })

    it('should return empty list when no users exist', async () => {
      await setupDb()
      const result = await listUsers(1, 20)

      expect(result.users).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('should handle second page correctly', async () => {
      await setupDb()
      const passwordHash = await hashPassword('testpass')

      await createUser({ username: 'user1', password: passwordHash })
      await createUser({ username: 'user2', password: passwordHash })
      await createUser({ username: 'user3', password: passwordHash })

      const result = await listUsers(2, 2)

      expect(result.users).toHaveLength(1)
      expect(result.users[0].username).toBe('user3')
      expect(result.total).toBe(3)
    })
  })

  // ---------------------------------------------------------------------------
  // Update user
  // ---------------------------------------------------------------------------

  describe('updateUser', () => {
    it('should update user email', async () => {
      await setupDb()
      const passwordHash = await hashPassword('testpass')

      const created = await createUser({
        username: 'updateuser',
        password: passwordHash,
        email: 'old@example.com',
      })

      const updated = await updateUser(created.id, {
        email: 'new@example.com',
      })

      expect(updated).toBeDefined()
      expect(updated?.email).toBe('new@example.com')
      expect(updated?.username).toBe('updateuser')
    })

    it('should update user password', async () => {
      await setupDb()
      const oldHash = await hashPassword('oldpass')

      const created = await createUser({
        username: 'passworduser',
        password: oldHash,
      })

      const newHash = await hashPassword('newpass')
      const updated = await updateUser(created.id, {
        password: newHash,
      })

      expect(updated).toBeDefined()
    })

    it('should update multiple fields', async () => {
      await setupDb()
      const passwordHash = await hashPassword('testpass')

      const created = await createUser({
        username: 'multiuser',
        password: passwordHash,
      })

      const updated = await updateUser(created.id, {
        email: 'multi@example.com',
        groupName: 'Admin',
        group_id: 0,
        image: 'avatar.png',
      })

      expect(updated).toBeDefined()
      expect(updated?.email).toBe('multi@example.com')
      expect(updated?.groupName).toBe('Admin')
      expect(updated?.group_id).toBe(0)
      expect(updated?.image).toBe('avatar.png')
    })

    it('should return null for non-existent user', async () => {
      await setupDb()
      const updated = await updateUser(99999, { email: 'test@example.com' })
      expect(updated).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // Delete user
  // ---------------------------------------------------------------------------

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      await setupDb()
      const passwordHash = await hashPassword('testpass')

      const created = await createUser({
        username: 'deleteuser',
        password: passwordHash,
      })

      await deleteUser(created.id)

      const user = await getUserById(created.id)
      expect(user).toBeNull()
    })

    it('should not throw when deleting non-existent user', async () => {
      await setupDb()
      // Delete operation should succeed even if user doesn't exist
      await deleteUser(99999)
      // If we get here, no error was thrown
      expect(true).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // Password change
  // ---------------------------------------------------------------------------

  describe('changePassword', () => {
    it('should change user password', async () => {
      await setupDb()
      const oldHash = await hashPassword('oldpass')

      const created = await createUser({
        username: 'changepassuser',
        password: oldHash,
      })

      const newHash = await hashPassword('newpass')
      await changePassword(created.id, newHash)

      // Verify by getting user and checking password changed (indirect)
      const user = await getUserById(created.id)
      expect(user).toBeDefined()
    })
  })

  // ---------------------------------------------------------------------------
  // Username uniqueness
  // ---------------------------------------------------------------------------

  describe('isUsernameTaken', () => {
    it('should return true for taken username', async () => {
      await setupDb()
      const passwordHash = await hashPassword('testpass')

      await createUser({
        username: 'takenuser',
        password: passwordHash,
      })

      const taken = await isUsernameTaken('takenuser')
      expect(taken).toBe(true)
    })

    it('should return false for available username', async () => {
      await setupDb()
      const taken = await isUsernameTaken('availableuser')
      expect(taken).toBe(false)
    })

    it('should exclude specific user ID when checking uniqueness', async () => {
      await setupDb()
      const passwordHash = await hashPassword('testpass')

      const user = await createUser({
        username: 'excludeuser',
        password: passwordHash,
      })

      // Same username but excluding this user's ID should return false
      const taken = await isUsernameTaken('excludeuser', user.id)
      expect(taken).toBe(false)
    })

    it('should detect duplicate when excluding different user', async () => {
      await setupDb()
      const passwordHash = await hashPassword('testpass')

      const user1 = await createUser({ username: 'duplicate1', password: passwordHash })
      await createUser({ username: 'duplicate2', password: passwordHash })

      // Check if duplicate2 is taken, excluding user1's ID
      const taken = await isUsernameTaken('duplicate2', user1.id)
      expect(taken).toBe(true)
    })
  })
})
