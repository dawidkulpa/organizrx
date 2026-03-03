import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Database } from 'bun:sqlite'

import { detectOldDb } from './detector'
import { createBackup } from './backup'
import { runMigration, getMigrationStatus } from './migrator'
import { migratedTables, skippedTables, tableMappings } from './column-map'
import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import * as sqliteSchema from '../db/schema/sqlite'

let testDir: string
let legacyDbPath: string
let newDbPath: string

function createTestDir(): string {
  const dir = join(tmpdir(), `organizrx-migration-test-${process.pid}-${Date.now()}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

function createLegacyDb(dbPath: string): Database {
  const db = new Database(dbPath)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      email TEXT,
      plex_token TEXT,
      "group" TEXT,
      group_id INTEGER,
      locked INTEGER,
      image TEXT,
      register_date DATETIME,
      auth_service TEXT DEFAULT 'internal'
    );
    CREATE TABLE IF NOT EXISTS chatroom (
      id INTEGER PRIMARY KEY,
      username TEXT,
      gravatar TEXT,
      uid TEXT,
      date DATETIME,
      ip TEXT,
      message TEXT
    );
    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY,
      token TEXT UNIQUE,
      user_id INTEGER,
      browser TEXT,
      ip TEXT,
      created DATETIME,
      expires DATETIME
    );
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY,
      "group" TEXT UNIQUE,
      group_id INTEGER,
      image TEXT,
      "default" INTEGER
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY,
      "order" INTEGER,
      category TEXT UNIQUE,
      category_id INTEGER,
      image TEXT,
      "default" INTEGER
    );
    CREATE TABLE IF NOT EXISTS tabs (
      id INTEGER PRIMARY KEY,
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
    );
    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS invites (
      id INTEGER PRIMARY KEY,
      code TEXT UNIQUE,
      date DATETIME,
      email TEXT,
      username TEXT,
      dateused TIMESTAMP,
      usedby TEXT,
      ip TEXT,
      valid TEXT,
      type TEXT,
      invitedby TEXT
    );
    CREATE TABLE IF NOT EXISTS "BOOKMARK-categories" (
      id INTEGER PRIMARY KEY,
      "order" INTEGER,
      category TEXT UNIQUE,
      category_id INTEGER,
      "default" INTEGER
    );
    CREATE TABLE IF NOT EXISTS "BOOKMARK-tabs" (
      id INTEGER PRIMARY KEY,
      "order" INTEGER,
      category_id INTEGER,
      name TEXT,
      url TEXT,
      enabled INTEGER,
      group_id INTEGER,
      image TEXT,
      background_color TEXT,
      text_color TEXT
    );
  `)
  return db
}

function seedLegacyData(db: Database) {
  db.exec(`
    INSERT INTO options (name, value) VALUES ('CONFIG_VERSION', '2.1.0');
    INSERT INTO options (name, value) VALUES ('title', 'My Organizr');
    INSERT INTO options (name, value) VALUES ('theme', 'dark');

    INSERT INTO groups ("group", group_id, image, "default") VALUES ('Admin', 0, 'admin.png', 0);
    INSERT INTO groups ("group", group_id, image, "default") VALUES ('User', 4, 'user.png', 1);
    INSERT INTO groups ("group", group_id, image, "default") VALUES ('Guest', 999, 'guest.png', 0);

    INSERT INTO users (username, password, email, "group", group_id, locked, auth_service)
    VALUES ('admin', '$2y$12$abc123hashedpassword', 'admin@test.com', 'Admin', 0, 0, 'internal');
    INSERT INTO users (username, password, email, "group", group_id, locked, auth_service)
    VALUES ('user1', '$2y$12$xyz789hashedpassword', 'user@test.com', 'User', 4, 0, 'internal');

    INSERT INTO categories ("order", category, category_id, image, "default") VALUES (1, 'Media', 1, 'media.png', 1);
    INSERT INTO categories ("order", category, category_id, image, "default") VALUES (2, 'Tools', 2, 'tools.png', 0);

    INSERT INTO tabs ("order", category_id, name, url, enabled, group_id, type)
    VALUES (1, 1, 'Plex', 'http://plex.local', 1, 0, 1);
    INSERT INTO tabs ("order", category_id, name, url, enabled, group_id, type)
    VALUES (2, 1, 'Sonarr', 'http://sonarr.local', 1, 2, 1);

    INSERT INTO tokens (token, user_id, browser, ip, created, expires)
    VALUES ('old-token-123', 1, 'Chrome', '127.0.0.1', '2024-01-01', '2024-12-31');

    INSERT INTO chatroom (username, gravatar, uid, date, ip, message)
    VALUES ('admin', 'abc123', 'uid-1', '2024-06-01', '127.0.0.1', 'Hello world');

    INSERT INTO invites (code, date, email, valid, type, invitedby)
    VALUES ('INV001', '2024-06-01', 'new@user.com', 'true', 'email', 'admin');

    INSERT INTO "BOOKMARK-categories" ("order", category, category_id, "default")
    VALUES (1, 'Bookmarks', 1, 1);

    INSERT INTO "BOOKMARK-tabs" ("order", category_id, name, url, enabled, group_id, image)
    VALUES (1, 1, 'Google', 'https://google.com', 1, 4, 'google.png');
  `)
}

function createNewDbTables(db: SqliteDb) {
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
    );
    CREATE TABLE IF NOT EXISTS chatroom (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      gravatar TEXT,
      uid TEXT,
      date TEXT,
      ip TEXT,
      message TEXT
    );
    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE,
      user_id INTEGER,
      browser TEXT,
      ip TEXT,
      created TEXT,
      expires TEXT
    );
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "group" TEXT UNIQUE,
      group_id INTEGER,
      image TEXT,
      "default" INTEGER
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "order" INTEGER,
      category TEXT UNIQUE,
      category_id INTEGER,
      image TEXT,
      "default" INTEGER
    );
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
    );
    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      date TEXT,
      email TEXT,
      username TEXT,
      dateused TEXT,
      usedby TEXT,
      ip TEXT,
      valid TEXT,
      type TEXT,
      invitedby TEXT
    );
    CREATE TABLE IF NOT EXISTS "BOOKMARK-categories" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "order" INTEGER,
      category TEXT UNIQUE,
      category_id INTEGER,
      "default" INTEGER
    );
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
    );
  `)
}

describe('migration', () => {
  beforeEach(async () => {
    await closeDb()
    testDir = createTestDir()
    legacyDbPath = join(testDir, 'organizr.db')
    newDbPath = join(testDir, 'new-organizr.db')
  })

  afterEach(async () => {
    await closeDb()
    try {
      rmSync(testDir, { recursive: true, force: true })
    } catch {
      // cleanup best-effort
    }
  })

  describe('column-map', () => {
    it('should have 10 total table mappings', () => {
      expect(tableMappings).toHaveLength(10)
    })

    it('should skip only the tokens table', () => {
      expect(skippedTables).toEqual(['tokens'])
    })

    it('should have 9 actively migrated tables', () => {
      expect(migratedTables).toHaveLength(9)
    })

    it('should include totp defaults for users table', () => {
      const usersMapping = tableMappings.find((t) => t.oldTable === 'users')
      expect(usersMapping?.defaults).toEqual({
        totp_secret: null,
        totp_enabled: 0,
        totp_backup_codes: null,
      })
    })

    it('should have a password transform for users table', () => {
      const usersMapping = tableMappings.find((t) => t.oldTable === 'users')
      const passwordCol = usersMapping?.columns.find((c) => c.oldColumn === 'password')
      expect(passwordCol?.transform).toBeDefined()
      expect(passwordCol?.transform?.('$2y$12$abc')).toBe('$2a$12$abc')
      expect(passwordCol?.transform?.('$2a$12$abc')).toBe('$2a$12$abc')
      expect(passwordCol?.transform?.(null)).toBe(null)
    })
  })

  describe('detector', () => {
    it('should return found=false when no DB exists', () => {
      const result = detectOldDb('/nonexistent/path.db')
      expect(result.found).toBe(false)
      expect(result.path).toBeNull()
    })

    it('should detect a valid legacy Organizr DB', () => {
      const db = createLegacyDb(legacyDbPath)
      seedLegacyData(db)
      db.close()

      const result = detectOldDb(legacyDbPath)
      expect(result.found).toBe(true)
      expect(result.path).toBe(legacyDbPath)
      expect(result.configVersion).toBe('2.1.0')
    })

    it('should return found=false for a DB without options table', () => {
      const db = new Database(legacyDbPath)
      db.exec('CREATE TABLE IF NOT EXISTS dummy (id INTEGER PRIMARY KEY)')
      db.close()

      const result = detectOldDb(legacyDbPath)
      expect(result.found).toBe(false)
    })

    it('should return found=true with null configVersion when no CONFIG_VERSION row', () => {
      const db = new Database(legacyDbPath)
      db.exec('CREATE TABLE options (id INTEGER PRIMARY KEY, name TEXT UNIQUE, value TEXT)')
      db.exec("INSERT INTO options (name, value) VALUES ('title', 'test')")
      db.close()

      const result = detectOldDb(legacyDbPath)
      expect(result.found).toBe(true)
      expect(result.configVersion).toBeNull()
    })
  })

  describe('backup', () => {
    it('should create a backup of the legacy DB', () => {
      const db = createLegacyDb(legacyDbPath)
      seedLegacyData(db)
      db.close()

      const originalDataDir = process.env.DATA_DIR
      process.env.DATA_DIR = testDir

      try {
        const backupPath = createBackup(legacyDbPath)
        expect(existsSync(backupPath)).toBe(true)
        expect(backupPath).toContain('organizr-backup-')
        expect(backupPath).toContain('.db')

        const backupDb = new Database(backupPath, { readonly: true })
        const rows = backupDb
          .query("SELECT value FROM options WHERE name = 'CONFIG_VERSION'")
          .get() as { value: string } | null
        expect(rows?.value).toBe('2.1.0')
        backupDb.close()
      } finally {
        if (originalDataDir !== undefined) {
          process.env.DATA_DIR = originalDataDir
        } else {
          delete process.env.DATA_DIR
        }
      }
    })

    it('should throw when source path does not exist', () => {
      expect(() => createBackup('/nonexistent/path.db')).toThrow('Source database not found')
    })
  })

  describe('migrator', () => {
    beforeEach(async () => {
      await initDb({ dialect: 'sqlite', url: newDbPath })
      const db = getRawDb() as SqliteDb
      createNewDbTables(db)
    })

    it('should return not detected when no legacy DB exists', async () => {
      const status = await getMigrationStatus('/nonexistent/path.db')
      expect(status.detected).toBe(false)
      expect(status.alreadyMigrated).toBe(false)
    })

    it('should detect legacy DB and report not yet migrated', async () => {
      const db = createLegacyDb(legacyDbPath)
      seedLegacyData(db)
      db.close()

      const status = await getMigrationStatus(legacyDbPath)
      expect(status.detected).toBe(true)
      expect(status.alreadyMigrated).toBe(false)
      expect(status.configVersion).toBe('2.1.0')
    })

    it('should migrate all data from legacy DB to new DB', async () => {
      const db = createLegacyDb(legacyDbPath)
      seedLegacyData(db)
      db.close()

      const originalDataDir = process.env.DATA_DIR
      process.env.DATA_DIR = testDir

      try {
        const progressUpdates: Array<{ table: string; current: number; total: number }> = []

        const result = await runMigration(legacyDbPath, (table, current, total) => {
          progressUpdates.push({ table, current, total })
        })

        expect(result.success).toBe(true)
        expect(result.error).toBeUndefined()
        expect(result.totalRows).toBeGreaterThan(0)
        expect(result.backupPath).toBeTruthy()
        expect(result.tablesProcessed.length).toBeGreaterThan(0)

        const newDb = getRawDb() as SqliteDb

        const users = newDb.select().from(sqliteSchema.users).all()
        expect(users).toHaveLength(2)

        const admin = users.find((u) => u.username === 'admin')
        expect(admin?.password).toStartWith('$2a$')
        expect(admin?.group_id).toBe(0)
        expect(admin?.totp_enabled).toBe(0)
        expect(admin?.totp_secret).toBeNull()

        const groups = newDb.select().from(sqliteSchema.groups).all()
        expect(groups).toHaveLength(3)
        const guestGroup = groups.find((g) => g.group_id === 999)
        expect(guestGroup?.group).toBe('Guest')

        const categories = newDb.select().from(sqliteSchema.categories).all()
        expect(categories).toHaveLength(2)

        const newTabs = newDb.select().from(sqliteSchema.tabs).all()
        expect(newTabs).toHaveLength(2)
        expect(newTabs.find((t) => t.name === 'Plex')?.order).toBe(1)
        expect(newTabs.find((t) => t.name === 'Sonarr')?.order).toBe(2)

        const tokens = newDb.select().from(sqliteSchema.tokens).all()
        expect(tokens).toHaveLength(0)

        const options = newDb.select().from(sqliteSchema.options).all()
        const migrationKey = options.find((o) => o.name === '_migration_completed')
        expect(migrationKey).toBeTruthy()

        expect(progressUpdates.length).toBeGreaterThan(0)
      } finally {
        if (originalDataDir !== undefined) {
          process.env.DATA_DIR = originalDataDir
        } else {
          delete process.env.DATA_DIR
        }
      }
    })

    it('should be idempotent — second run returns already completed', async () => {
      const db = createLegacyDb(legacyDbPath)
      seedLegacyData(db)
      db.close()

      const originalDataDir = process.env.DATA_DIR
      process.env.DATA_DIR = testDir

      try {
        const first = await runMigration(legacyDbPath)
        expect(first.success).toBe(true)

        const second = await runMigration(legacyDbPath)
        expect(second.success).toBe(true)
        expect(second.error).toBe('Migration already completed')
        expect(second.totalRows).toBe(0)
      } finally {
        if (originalDataDir !== undefined) {
          process.env.DATA_DIR = originalDataDir
        } else {
          delete process.env.DATA_DIR
        }
      }
    })

    it('should return error when no legacy DB is found', async () => {
      const result = await runMigration('/nonexistent/path.db')
      expect(result.success).toBe(false)
      expect(result.error).toContain('No legacy Organizr database found')
    })

    it('should swap bcrypt $2y$ prefix to $2a$ during migration', async () => {
      const db = createLegacyDb(legacyDbPath)
      db.exec(`
        INSERT INTO options (name, value) VALUES ('CONFIG_VERSION', '2.0');
        INSERT INTO users (username, password, email, "group", group_id, locked, auth_service)
        VALUES ('bcryptuser', '$2y$12$testbcrypthash', 'bcrypt@test.com', 'User', 4, 0, 'internal');
      `)
      db.close()

      const originalDataDir = process.env.DATA_DIR
      process.env.DATA_DIR = testDir

      try {
        await runMigration(legacyDbPath)

        const newDb = getRawDb() as SqliteDb
        const users = newDb.select().from(sqliteSchema.users).all()
        const bcryptUser = users.find((u) => u.username === 'bcryptuser')
        expect(bcryptUser?.password).toBe('$2a$12$testbcrypthash')
      } finally {
        if (originalDataDir !== undefined) {
          process.env.DATA_DIR = originalDataDir
        } else {
          delete process.env.DATA_DIR
        }
      }
    })

    it('should preserve group IDs exactly', async () => {
      const db = createLegacyDb(legacyDbPath)
      seedLegacyData(db)
      db.close()

      const originalDataDir = process.env.DATA_DIR
      process.env.DATA_DIR = testDir

      try {
        await runMigration(legacyDbPath)

        const newDb = getRawDb() as SqliteDb
        const groups = newDb.select().from(sqliteSchema.groups).all()

        const adminGroup = groups.find((g) => g.group === 'Admin')
        expect(adminGroup?.group_id).toBe(0)

        const userGroup = groups.find((g) => g.group === 'User')
        expect(userGroup?.group_id).toBe(4)

        const guestGroup = groups.find((g) => g.group === 'Guest')
        expect(guestGroup?.group_id).toBe(999)
      } finally {
        if (originalDataDir !== undefined) {
          process.env.DATA_DIR = originalDataDir
        } else {
          delete process.env.DATA_DIR
        }
      }
    })

    it('should migrate bookmark tables', async () => {
      const db = createLegacyDb(legacyDbPath)
      seedLegacyData(db)
      db.close()

      const originalDataDir = process.env.DATA_DIR
      process.env.DATA_DIR = testDir

      try {
        await runMigration(legacyDbPath)

        const newDb = getRawDb() as SqliteDb
        const bookmarkCats = newDb.select().from(sqliteSchema.bookmarkCategories).all()
        expect(bookmarkCats).toHaveLength(1)
        expect(bookmarkCats[0].category).toBe('Bookmarks')

        const bookmarkTabs = newDb.select().from(sqliteSchema.bookmarkTabs).all()
        expect(bookmarkTabs).toHaveLength(1)
        expect(bookmarkTabs[0].name).toBe('Google')
      } finally {
        if (originalDataDir !== undefined) {
          process.env.DATA_DIR = originalDataDir
        } else {
          delete process.env.DATA_DIR
        }
      }
    })
  })
})
