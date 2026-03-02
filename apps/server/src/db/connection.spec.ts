import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  initDb,
  getDb,
  getSchema,
  getDialect,
  healthCheck,
  closeDb,
  getRawDb,
} from './connection'
import type { SqliteDb } from './connection'
import * as sqliteSchema from './schema/sqlite'

let testDbPath: string

function uniqueDbPath(suffix = 'default'): string {
  const dir = join(tmpdir(), 'organizrx-test-' + process.pid)
  mkdirSync(dir, { recursive: true })
  return join(dir, `test-${suffix}-${Date.now()}.db`)
}

describe('connection manager', () => {
  beforeEach(async () => {
    // closeDb is idempotent — ensures clean state even if prior test leaked
    await closeDb()
    testDbPath = uniqueDbPath()
  })

  afterEach(async () => {
    await closeDb()
  })

  // -----------------------------------------------------------------------
  // initDb
  // -----------------------------------------------------------------------

  describe('initDb', () => {
    it('should create an SQLite connection', async () => {
      const result = await initDb({ dialect: 'sqlite', url: testDbPath })

      expect(result.db).toBeDefined()
      expect(result.schema).toBeDefined()
      expect(result.schema).toEqual(sqliteSchema)
    })

    it('should create the data directory if it does not exist', async () => {
      const dir = join(tmpdir(), 'organizrx-test-nested-' + Date.now())
      const nestedPath = join(dir, 'sub', 'dir', 'test.db')
      await initDb({ dialect: 'sqlite', url: nestedPath })

      expect(existsSync(join(dir, 'sub', 'dir'))).toBe(true)
    })

    it('should throw if called twice without closeDb()', async () => {
      await initDb({ dialect: 'sqlite', url: testDbPath })

      expect(
        initDb({ dialect: 'sqlite', url: testDbPath })
      ).rejects.toThrow('Database already initialized')
    })

    it('should allow reinit after closeDb()', async () => {
      await initDb({ dialect: 'sqlite', url: testDbPath })
      await closeDb()
      const result = await initDb({ dialect: 'sqlite', url: testDbPath })

      expect(result.db).toBeDefined()
    })

    it('should throw for unsupported dialect', async () => {
      expect(
        // @ts-expect-error — testing invalid input
        initDb({ dialect: 'mongodb', url: 'mongodb://localhost' })
      ).rejects.toThrow('Unsupported database dialect')
    })
  })

  // -----------------------------------------------------------------------
  // getDb / getSchema / getDialect
  // -----------------------------------------------------------------------

  describe('getDb', () => {
    it('should throw before initDb', () => {
      expect(() => getDb()).toThrow('Database not initialized')
    })

    it('should return the db after initDb', async () => {
      await initDb({ dialect: 'sqlite', url: testDbPath })
      expect(getDb()).toBeDefined()
    })
  })

  describe('getRawDb', () => {
    it('should throw before initDb', () => {
      expect(() => getRawDb()).toThrow('Database not initialized')
    })

    it('should return the raw drizzle instance', async () => {
      await initDb({ dialect: 'sqlite', url: testDbPath })
      const raw = getRawDb()
      expect(raw).toBeDefined()
    })
  })

  describe('getSchema', () => {
    it('should throw before initDb', () => {
      expect(() => getSchema()).toThrow('Database not initialized')
    })

    it('should return sqlite schema for sqlite dialect', async () => {
      await initDb({ dialect: 'sqlite', url: testDbPath })
      const schema = getSchema()
      expect(schema).toBe(sqliteSchema)
      expect(schema.users).toBeDefined()
      expect(schema.groups).toBeDefined()
      expect(schema.tabs).toBeDefined()
    })
  })

  describe('getDialect', () => {
    it('should throw before initDb', () => {
      expect(() => getDialect()).toThrow('Database not initialized')
    })

    it('should return sqlite for sqlite dialect', async () => {
      await initDb({ dialect: 'sqlite', url: testDbPath })
      expect(getDialect()).toBe('sqlite')
    })
  })

  // -----------------------------------------------------------------------
  // Health check
  // -----------------------------------------------------------------------

  describe('healthCheck', () => {
    it('should return ok:false before initDb', async () => {
      const result = await healthCheck()
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Database not initialized')
    })

    it('should return ok:true after sqlite init', async () => {
      await initDb({ dialect: 'sqlite', url: testDbPath })
      const result = await healthCheck()

      expect(result.ok).toBe(true)
      expect(result.dialect).toBe('sqlite')
      expect(result.latencyMs).toBeGreaterThanOrEqual(0)
      expect(result.error).toBeUndefined()
    })

    it('should measure latency', async () => {
      await initDb({ dialect: 'sqlite', url: testDbPath })
      const result = await healthCheck()

      expect(typeof result.latencyMs).toBe('number')
      // SQLite SELECT 1 should be sub-100ms
      expect(result.latencyMs).toBeLessThan(100)
    })
  })

  // -----------------------------------------------------------------------
  // closeDb
  // -----------------------------------------------------------------------

  describe('closeDb', () => {
    it('should be idempotent (safe to call multiple times)', async () => {
      await initDb({ dialect: 'sqlite', url: testDbPath })
      await closeDb()
      await closeDb() // should not throw
    })

    it('should reset all state', async () => {
      await initDb({ dialect: 'sqlite', url: testDbPath })
      await closeDb()

      expect(() => getDb()).toThrow('Database not initialized')
      expect(() => getSchema()).toThrow('Database not initialized')
      expect(() => getDialect()).toThrow('Database not initialized')
    })
  })

  // -----------------------------------------------------------------------
  // SQLite-specific behavior
  // -----------------------------------------------------------------------

  describe('sqlite specifics', () => {
    it('should be able to create tables and insert data', async () => {
      await initDb({ dialect: 'sqlite', url: testDbPath })
      const db = getRawDb() as SqliteDb

      // Create the groups table manually for test
      db.$client.exec(`
        CREATE TABLE IF NOT EXISTS groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          "group" TEXT UNIQUE,
          group_id INTEGER,
          image TEXT,
          "default" INTEGER
        )
      `)

      // Insert a row via drizzle
      await db.insert(sqliteSchema.groups).values({
        group: 'TestGroup',
        group_id: 99,
        image: 'test.png',
        default: 0,
      })

      // Read it back
      const rows = await db.select().from(sqliteSchema.groups)
      expect(rows).toHaveLength(1)
      expect(rows[0].group).toBe('TestGroup')
      expect(rows[0].group_id).toBe(99)
    })

    it('should set WAL mode and foreign keys', async () => {
      await initDb({ dialect: 'sqlite', url: testDbPath })
      const db = getRawDb() as SqliteDb

      // Check journal mode via raw SQLite query
      const journalMode = db.$client.query('PRAGMA journal_mode').get() as { journal_mode: string }
      expect(journalMode.journal_mode).toBe('wal')

      // Check foreign keys enabled
      const fk = db.$client.query('PRAGMA foreign_keys').get() as { foreign_keys: number }
      expect(fk.foreign_keys).toBe(1)
    })
  })
})
