/**
 * Multi-dialect database connection manager.
 *
 * Reads DATABASE_DIALECT from the environment to select the correct Drizzle
 * driver + schema.  Exports a thin public API that hides dialect differences
 * from the rest of the application:
 *
 *   initDb()     — create the connection (call once at startup)
 *   getDb()      — return the cached Drizzle instance
 *   healthCheck()— run `SELECT 1` and return latency
 *   closeDb()    — tear down the connection (SIGTERM / tests)
 */

import { Database } from 'bun:sqlite'
import { drizzle as drizzleBunSqlite, type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import { drizzle as drizzleMysql, type MySql2Database } from 'drizzle-orm/mysql2'
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { sql } from 'drizzle-orm'
import { createPool, type Pool } from 'mysql2/promise'
import postgres, { type Sql } from 'postgres'

import type { DatabaseDialect } from '../config/env'

import * as sqliteSchema from './schema/sqlite'
import * as mysqlSchema from './schema/mysql'
import * as pgSchema from './schema/pg'
import { ensureSqliteSchema } from './sqlite-bootstrap'
import { ensureMysqlSchema } from './mysql-bootstrap'
import { ensurePgSchema } from './pg-bootstrap'

/** Retry an async operation with exponential backoff (for container startup). */
async function withRetry<T>(fn: () => Promise<T>, label: string, maxRetries = 10, baseDelayMs = 1000): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === maxRetries) throw err
      const delay = baseDelayMs * Math.min(attempt, 5)
      console.warn(`[db] ${label} attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`)
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw new Error('unreachable')
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Individual dialect DB types — useful when callers know the dialect. */
export type SqliteDb = BunSQLiteDatabase<typeof sqliteSchema> & { $client: Database }
export type MysqlDb = MySql2Database<typeof mysqlSchema> & { $client: Pool }
export type PostgresDb = PostgresJsDatabase<typeof pgSchema> & { $client: Sql }

/**
 * Opaque database handle.  Callers receive this from `getDb()` and pass it
 * back to service functions.  The actual type is one of SqliteDb | MysqlDb |
 * PostgresDb, but we store it as `unknown` internally to avoid TS union
 * incompatibilities between Drizzle dialect return types.
 *
 * Service modules that need to run queries should accept this type and
 * cast locally based on `getDialect()` when dialect-specific behaviour is
 * needed (rare — most Drizzle queries work identically across dialects).
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DrizzleDb {
  /** Brand field to prevent accidental assignment of arbitrary objects. */
  readonly __brand: 'DrizzleDb'
}

/**
 * Dialect-specific schema — the `*` export of the relevant schema file.
 * Callers that need table references should use `getSchema()`.
 */
export type DbSchema = typeof sqliteSchema | typeof mysqlSchema | typeof pgSchema

export interface HealthCheckResult {
  ok: boolean
  dialect: DatabaseDialect
  latencyMs: number
  error?: string
}

// ---------------------------------------------------------------------------
// Module state (singleton)
// ---------------------------------------------------------------------------

let _db: unknown = null
let _dialect: DatabaseDialect | null = null
let _schema: DbSchema | null = null

// Keep references to the underlying drivers so we can close them.
let sqliteClient: Database | null = null
let mysqlPool: Pool | null = null
let pgClient: Sql | null = null

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

export interface InitDbOptions {
  dialect: DatabaseDialect
  url: string
}

/**
 * Create the database connection.  Must be called exactly once at startup.
 *
 * @returns The Drizzle instance (as opaque DrizzleDb) and the schema.
 */
export async function initDb(opts: InitDbOptions): Promise<{ db: DrizzleDb; schema: DbSchema }> {
  if (_db) {
    throw new Error('Database already initialized. Call closeDb() first if you need to reinitialize.')
  }

  _dialect = opts.dialect

  switch (opts.dialect) {
    case 'sqlite': {
      // Ensure data directory exists for the SQLite file
      const dbPath = opts.url
      const { dirname } = await import('node:path')
      const dir = dirname(dbPath)
      if (dir && dir !== '.' && dir !== dbPath) {
        const { mkdirSync } = await import('node:fs')
        mkdirSync(dir, { recursive: true })
      }

      sqliteClient = new Database(dbPath)
      // Enable WAL mode for better concurrent read performance
      sqliteClient.exec('PRAGMA journal_mode = WAL')
      sqliteClient.exec('PRAGMA foreign_keys = ON')

      // Ensure all tables exist (first-run schema bootstrap)
      ensureSqliteSchema(sqliteClient)

      _schema = sqliteSchema
      _db = drizzleBunSqlite({ client: sqliteClient, schema: sqliteSchema })
      break
    }

    case 'mysql': {
      mysqlPool = createPool({
        uri: opts.url,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10_000,
      })

      // Ensure all tables exist (first-run schema bootstrap)
      await withRetry(() => ensureMysqlSchema(mysqlPool!), 'mysql-bootstrap')

      _schema = mysqlSchema
      _db = drizzleMysql({ client: mysqlPool, schema: mysqlSchema, mode: 'default' })
      break
    }

    case 'postgresql': {
      pgClient = postgres(opts.url, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      })

      // Ensure all tables exist (first-run schema bootstrap)
      await withRetry(() => ensurePgSchema(pgClient!), 'pg-bootstrap')

      _schema = pgSchema
      _db = drizzlePostgres({ client: pgClient, schema: pgSchema })
      break
    }

    default:
      throw new Error(`Unsupported database dialect: ${opts.dialect as string}`)
  }

  return { db: _db as unknown as DrizzleDb, schema: _schema }
}

// ---------------------------------------------------------------------------
// Accessors
// ---------------------------------------------------------------------------

/**
 * Return the cached Drizzle instance.
 * Throws if `initDb()` hasn't been called.
 */
export function getDb(): DrizzleDb {
  if (!_db) {
    throw new Error('Database not initialized. Call initDb() at startup.')
  }
  return _db as unknown as DrizzleDb
}

/**
 * Return the raw Drizzle instance for internal use (queries, migrations).
 * Callers inside the db module can use this to avoid the opaque wrapper.
 * @internal
 */
export function getRawDb(): unknown {
  if (!_db) {
    throw new Error('Database not initialized. Call initDb() at startup.')
  }
  return _db
}

/**
 * Return the dialect-specific schema.
 * Throws if `initDb()` hasn't been called.
 */
export function getSchema(): DbSchema {
  if (!_schema) {
    throw new Error('Database not initialized. Call initDb() at startup.')
  }
  return _schema
}

/**
 * Return the active dialect.
 */
export function getDialect(): DatabaseDialect {
  if (!_dialect) {
    throw new Error('Database not initialized. Call initDb() at startup.')
  }
  return _dialect
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

/**
 * Execute `SELECT 1` against the active connection and measure latency.
 */
export async function healthCheck(): Promise<HealthCheckResult> {
  if (!_db || !_dialect) {
    return { ok: false, dialect: _dialect ?? 'sqlite', latencyMs: 0, error: 'Database not initialized' }
  }

  const start = performance.now()

  try {
    switch (_dialect) {
      case 'sqlite': {
        const db = _db as SqliteDb
        db.run(sql`SELECT 1`)
        break
      }
      case 'mysql': {
        const db = _db as MysqlDb
        await db.execute(sql`SELECT 1`)
        break
      }
      case 'postgresql': {
        const db = _db as PostgresDb
        await db.execute(sql`SELECT 1`)
        break
      }
    }

    const latencyMs = Math.round((performance.now() - start) * 100) / 100
    return { ok: true, dialect: _dialect, latencyMs }
  } catch (err) {
    const latencyMs = Math.round((performance.now() - start) * 100) / 100
    return {
      ok: false,
      dialect: _dialect,
      latencyMs,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ---------------------------------------------------------------------------
// Shutdown
// ---------------------------------------------------------------------------

/**
 * Close the database connection and reset module state.
 * Safe to call multiple times (idempotent).
 */
export async function closeDb(): Promise<void> {
  if (sqliteClient) {
    sqliteClient.close()
    sqliteClient = null
  }

  if (mysqlPool) {
    await mysqlPool.end()
    mysqlPool = null
  }

  if (pgClient) {
    await pgClient.end()
    pgClient = null
  }

  _db = null
  _schema = null
  _dialect = null
}
