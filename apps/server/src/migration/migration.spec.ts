import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Database } from 'bun:sqlite'

import { detectOldDb } from './detector'
import { createBackup } from './backup'
import { runMigration, getMigrationStatus } from './migrator'
import {
  schemaMigrations,
  DATA_TRANSFORMS,
  TABLES_TO_CLEAR,
  MIGRATION_COMPLETED_KEY,
  swapBcryptPrefix,
} from './column-map'
import { initDb, closeDb, getRawDb, getDialect } from '../db'
import type { SqliteDb } from '../db'
import { queryRawSql } from './sql-helpers'

let testDir: string
let dbPath: string

function createTestDir(): string {
  const dir = join(tmpdir(), `organizrx-migration-test-${process.pid}-${Date.now()}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * Create a DB with the OLD Organizr schema — no TOTP columns on users.
 * This simulates what an existing Organizr installation looks like.
 */
function createOldSchemaDb(path: string): Database {
  const db = new Database(path)
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

function seedTestData(db: Database) {
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
    INSERT INTO tokens (token, user_id, browser, ip, created, expires)
    VALUES ('old-token-456', 2, 'Firefox', '10.0.0.1', '2024-02-01', '2025-01-31');

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

describe('migration', () => {
  beforeEach(async () => {
    await closeDb()
    testDir = createTestDir()
    dbPath = join(testDir, 'organizr.db')
  })

  afterEach(async () => {
    await closeDb()
    try {
      rmSync(testDir, { recursive: true, force: true })
    } catch {
      // cleanup best-effort
    }
  })

  // -------------------------------------------------------------------------
  // column-map
  // -------------------------------------------------------------------------
  describe('column-map', () => {
    it('should define schema migrations for the users table', () => {
      expect(schemaMigrations).toHaveLength(1)
      expect(schemaMigrations[0].table).toBe('users')
    })

    it('should define 3 TOTP columns to add', () => {
      const cols = schemaMigrations[0].addColumns
      expect(cols).toHaveLength(3)

      const names = cols.map((c) => c.name)
      expect(names).toContain('totp_secret')
      expect(names).toContain('totp_enabled')
      expect(names).toContain('totp_backup_codes')
    })

    it('should define the bcrypt prefix swap as a data transform', () => {
      expect(DATA_TRANSFORMS).toHaveLength(1)
      expect(DATA_TRANSFORMS[0].description).toContain('$2y$')
      expect(DATA_TRANSFORMS[0].sql).toContain('REPLACE')
    })

    it('should define tokens as the only table to clear', () => {
      expect(TABLES_TO_CLEAR).toEqual(['tokens'])
    })

    it('should define the migration completed key', () => {
      expect(MIGRATION_COMPLETED_KEY).toBe('_migration_completed')
    })
  })

  // -------------------------------------------------------------------------
  // swapBcryptPrefix
  // -------------------------------------------------------------------------
  describe('swapBcryptPrefix', () => {
    it('should swap $2y$ to $2a$', () => {
      expect(swapBcryptPrefix('$2y$12$abc')).toBe('$2a$12$abc')
    })

    it('should leave $2a$ unchanged', () => {
      expect(swapBcryptPrefix('$2a$12$abc')).toBe('$2a$12$abc')
    })

    it('should return null for null input', () => {
      expect(swapBcryptPrefix(null)).toBe(null)
    })

    it('should return non-string values as-is', () => {
      expect(swapBcryptPrefix(42)).toBe(42)
      expect(swapBcryptPrefix(undefined)).toBe(undefined)
    })
  })

  // -------------------------------------------------------------------------
  // detector
  // -------------------------------------------------------------------------
  describe('detector', () => {
    it('should return found=false when no DB exists', () => {
      const result = detectOldDb('/nonexistent/path.db')
      expect(result.found).toBe(false)
      expect(result.path).toBeNull()
    })

    it('should detect a valid legacy Organizr DB', () => {
      const db = createOldSchemaDb(dbPath)
      seedTestData(db)
      db.close()

      const result = detectOldDb(dbPath)
      expect(result.found).toBe(true)
      expect(result.path).toBe(dbPath)
      expect(result.configVersion).toBe('2.1.0')
    })

    it('should return found=false for a DB without options table', () => {
      const db = new Database(dbPath)
      db.exec('CREATE TABLE IF NOT EXISTS dummy (id INTEGER PRIMARY KEY)')
      db.close()

      const result = detectOldDb(dbPath)
      expect(result.found).toBe(false)
    })

    it('should return found=true with null configVersion when no CONFIG_VERSION row', () => {
      const db = new Database(dbPath)
      db.exec('CREATE TABLE options (id INTEGER PRIMARY KEY, name TEXT UNIQUE, value TEXT)')
      db.exec("INSERT INTO options (name, value) VALUES ('title', 'test')")
      db.close()

      const result = detectOldDb(dbPath)
      expect(result.found).toBe(true)
      expect(result.configVersion).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // backup
  // -------------------------------------------------------------------------
  describe('backup', () => {
    it('should create a backup of the legacy DB', () => {
      const db = createOldSchemaDb(dbPath)
      seedTestData(db)
      db.close()

      const originalDataDir = process.env.DATA_DIR
      process.env.DATA_DIR = testDir

      try {
        const backupPath = createBackup(dbPath)
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

  // -------------------------------------------------------------------------
  // migrator — in-place schema migration
  // -------------------------------------------------------------------------
  describe('migrator', () => {
    beforeEach(async () => {
      // Create old-schema DB, close raw handle, then let Drizzle open it
      const rawDb = createOldSchemaDb(dbPath)
      seedTestData(rawDb)
      rawDb.close()

      // Init Drizzle on the SAME DB (it has old schema, missing TOTP columns)
      await initDb({ dialect: 'sqlite', url: dbPath })
    })

    // -- getMigrationStatus --

    it('should report needsMigration=true for old schema DB', async () => {
      const status = await getMigrationStatus()
      expect(status.needsMigration).toBe(true)
      expect(status.alreadyMigrated).toBe(false)
      expect(status.configVersion).toBe('2.1.0')
      expect(status.missingColumns.length).toBeGreaterThan(0)
      expect(status.missingColumns).toContain('users.totp_secret')
      expect(status.missingColumns).toContain('users.totp_enabled')
      expect(status.missingColumns).toContain('users.totp_backup_codes')
    })

    it('should report needsMigration=false after migration is completed', async () => {
      await runMigration(undefined, dbPath)

      const status = await getMigrationStatus()
      expect(status.needsMigration).toBe(false)
      expect(status.alreadyMigrated).toBe(true)
      expect(status.missingColumns).toHaveLength(0)
    })

    // -- runMigration --

    it('should add missing TOTP columns via ALTER TABLE', async () => {
      const result = await runMigration(undefined, dbPath)

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      expect(result.columnsAdded).toContain('users.totp_secret')
      expect(result.columnsAdded).toContain('users.totp_enabled')
      expect(result.columnsAdded).toContain('users.totp_backup_codes')
      expect(result.durationMs).toBeGreaterThanOrEqual(0)

      // Verify columns actually exist via PRAGMA
      const rawDb = getRawDb() as SqliteDb
      const cols = rawDb.$client.query('PRAGMA table_info("users")').all() as Array<{
        name: string
      }>
      const colNames = cols.map((c) => c.name)
      expect(colNames).toContain('totp_secret')
      expect(colNames).toContain('totp_enabled')
      expect(colNames).toContain('totp_backup_codes')
    })

    it('should swap bcrypt $2y$ prefix to $2a$ during migration', async () => {
      await runMigration(undefined, dbPath)

      const dialect = getDialect()
      const users = await queryRawSql(dialect, 'SELECT username, password FROM users')
      const admin = users.find((u) => u.username === 'admin')
      const user1 = users.find((u) => u.username === 'user1')

      expect(String(admin?.password)).toStartWith('$2a$')
      expect(String(user1?.password)).toStartWith('$2a$')
      // Ensure original hash body is preserved
      expect(String(admin?.password)).toBe('$2a$12$abc123hashedpassword')
      expect(String(user1?.password)).toBe('$2a$12$xyz789hashedpassword')
    })

    it('should clear the tokens table during migration', async () => {
      // Verify tokens exist before migration
      const dialect = getDialect()
      const tokensBefore = await queryRawSql(dialect, 'SELECT COUNT(*) as cnt FROM tokens')
      expect(Number(tokensBefore[0].cnt)).toBe(2)

      await runMigration(undefined, dbPath)

      const tokensAfter = await queryRawSql(dialect, 'SELECT COUNT(*) as cnt FROM tokens')
      expect(Number(tokensAfter[0].cnt)).toBe(0)

      expect((await runMigration()).tablesCleared).toHaveLength(0) // idempotent won't re-clear
    })

    it('should record the migration completion marker in options', async () => {
      await runMigration(undefined, dbPath)

      const dialect = getDialect()
      const rows = await queryRawSql(
        dialect,
        `SELECT value FROM options WHERE name = '${MIGRATION_COMPLETED_KEY}'`
      )
      expect(rows).toHaveLength(1)
      // value is an ISO timestamp
      expect(String(rows[0].value)).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('should report transforms applied', async () => {
      const result = await runMigration(undefined, dbPath)
      expect(result.transformsApplied).toHaveLength(1)
      expect(result.transformsApplied[0]).toContain('$2y$')
    })

    it('should report tables cleared', async () => {
      const result = await runMigration(undefined, dbPath)
      expect(result.tablesCleared).toEqual(['tokens'])
    })

    it('should create a backup for SQLite when dbFilePath is provided', async () => {
      const originalDataDir = process.env.DATA_DIR
      process.env.DATA_DIR = testDir

      try {
        const result = await runMigration(undefined, dbPath)
        expect(result.backupPath).toBeTruthy()
        expect(existsSync(result.backupPath!)).toBe(true)
      } finally {
        if (originalDataDir !== undefined) {
          process.env.DATA_DIR = originalDataDir
        } else {
          delete process.env.DATA_DIR
        }
      }
    })

    it('should not create backup when dbFilePath is omitted', async () => {
      const result = await runMigration()
      expect(result.backupPath).toBeNull()
    })

    it('should be idempotent — second run returns already completed', async () => {
      const first = await runMigration(undefined, dbPath)
      expect(first.success).toBe(true)
      expect(first.error).toBeUndefined()

      const second = await runMigration(undefined, dbPath)
      expect(second.success).toBe(true)
      expect(second.error).toBe('Migration already completed')
      expect(second.columnsAdded).toHaveLength(0)
      expect(second.tablesCleared).toHaveLength(0)
      expect(second.transformsApplied).toHaveLength(0)
    })

    it('should fire progress callbacks', async () => {
      const progressUpdates: Array<{ step: string; current: number; total: number }> = []

      await runMigration((step, current, total) => {
        progressUpdates.push({ step, current, total })
      }, dbPath)

      expect(progressUpdates.length).toBeGreaterThan(0)
      // Should have: 3 column adds + 1 transform + 1 table clear + 1 finalize = 6 steps
      const totalSteps = progressUpdates[0].total
      expect(totalSteps).toBe(
        schemaMigrations.reduce((s, m) => s + m.addColumns.length, 0) +
          DATA_TRANSFORMS.length +
          TABLES_TO_CLEAR.length +
          1
      )
      // Last progress should equal total
      const last = progressUpdates[progressUpdates.length - 1]
      expect(last.current).toBe(last.total)
    })

    it('should gracefully handle columns that already exist', async () => {
      // Run migration once to add columns
      await runMigration(undefined, dbPath)

      // Manually remove the migration marker so it tries again
      const rawDb = getRawDb() as SqliteDb
      rawDb.$client.exec(`DELETE FROM options WHERE name = '${MIGRATION_COMPLETED_KEY}'`)

      // Second run should succeed without error — columns already exist
      const result = await runMigration(undefined, dbPath)
      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      // No columns added (they already exist)
      expect(result.columnsAdded).toHaveLength(0)
      // Transforms and clears still run
      expect(result.transformsApplied).toHaveLength(1)
      expect(result.tablesCleared).toEqual(['tokens'])
    })

    it('should preserve existing data in all other tables', async () => {
      await runMigration(undefined, dbPath)

      const dialect = getDialect()

      // Groups preserved
      const groups = await queryRawSql(dialect, 'SELECT * FROM groups')
      expect(groups).toHaveLength(3)
      expect(groups.find((g) => g.group_id === 0)).toBeTruthy()
      expect(groups.find((g) => g.group_id === 999)).toBeTruthy()

      // Categories preserved
      const cats = await queryRawSql(dialect, 'SELECT * FROM categories')
      expect(cats).toHaveLength(2)

      // Tabs preserved
      const tabs = await queryRawSql(dialect, 'SELECT * FROM tabs')
      expect(tabs).toHaveLength(2)

      // Chatroom preserved
      const chat = await queryRawSql(dialect, 'SELECT * FROM chatroom')
      expect(chat).toHaveLength(1)

      // Invites preserved
      const invites = await queryRawSql(dialect, 'SELECT * FROM invites')
      expect(invites).toHaveLength(1)

      // Bookmark tables preserved
      const bmCats = await queryRawSql(dialect, 'SELECT * FROM "BOOKMARK-categories"')
      expect(bmCats).toHaveLength(1)

      const bmTabs = await queryRawSql(dialect, 'SELECT * FROM "BOOKMARK-tabs"')
      expect(bmTabs).toHaveLength(1)
    })

    it('should set TOTP defaults correctly on existing users', async () => {
      await runMigration(undefined, dbPath)

      const dialect = getDialect()
      const users = await queryRawSql(dialect, 'SELECT * FROM users')
      for (const user of users) {
        expect(user.totp_enabled).toBe(0)
        expect(user.totp_secret).toBeNull()
        expect(user.totp_backup_codes).toBeNull()
      }
    })
  })

  // -------------------------------------------------------------------------
  // migrator — fresh DB (no old Organizr markers)
  // -------------------------------------------------------------------------
  describe('migrator - fresh DB', () => {
    it('should report needsMigration=false for a fresh DB with all columns', async () => {
      // Create a DB with the NEW schema (includes TOTP columns)
      const freshDb = new Database(dbPath)
      freshDb.exec(`
        CREATE TABLE users (
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
          auth_service TEXT DEFAULT 'internal',
          totp_secret TEXT,
          totp_enabled INTEGER DEFAULT 0,
          totp_backup_codes TEXT
        );
        CREATE TABLE options (
          id INTEGER PRIMARY KEY,
          name TEXT UNIQUE,
          value TEXT
        );
        CREATE TABLE tokens (
          id INTEGER PRIMARY KEY,
          token TEXT UNIQUE,
          user_id INTEGER,
          browser TEXT,
          ip TEXT,
          created TEXT,
          expires TEXT
        );
      `)
      freshDb.close()

      await initDb({ dialect: 'sqlite', url: dbPath })

      const status = await getMigrationStatus()
      expect(status.needsMigration).toBe(false)
      expect(status.alreadyMigrated).toBe(false)
      expect(status.configVersion).toBeNull()
      expect(status.missingColumns).toHaveLength(0)
    })
  })
})
