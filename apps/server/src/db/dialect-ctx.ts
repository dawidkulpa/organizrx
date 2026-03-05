/**
 * Shared dialect context helper.
 *
 * Eliminates the duplicated `dialectCtx()` pattern across service files by
 * providing a single generic function that returns a correctly-typed
 * discriminated union of `{ db, dialect, ...tables }`.
 */

import { getRawDb, getDialect, type SqliteDb, type MysqlDb, type PostgresDb } from './connection'
import * as sqliteSchema from './schema/sqlite'
import * as mysqlSchema from './schema/mysql'
import * as pgSchema from './schema/pg'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Table names exported by all three dialect schemas. */
type SchemaTableKey = keyof typeof sqliteSchema & keyof typeof mysqlSchema & keyof typeof pgSchema

/** Discriminated-union result for a given set of table keys. */
type DialectCtxResult<K extends SchemaTableKey> =
  | ({ db: SqliteDb; dialect: 'sqlite' } & { [P in K]: (typeof sqliteSchema)[P] })
  | ({ db: MysqlDb; dialect: 'mysql' } & { [P in K]: (typeof mysqlSchema)[P] })
  | ({ db: PostgresDb; dialect: 'postgresql' } & { [P in K]: (typeof pgSchema)[P] })

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

const schemas = {
  sqlite: sqliteSchema,
  mysql: mysqlSchema,
  postgresql: pgSchema,
} as const

/**
 * Build a typed dialect context that includes the raw DB handle, the active
 * dialect string, and whichever schema tables the caller requests.
 *
 * @example
 * ```ts
 * const ctx = dialectCtx('users', 'tokens')
 * // ctx.dialect  — 'sqlite' | 'mysql' | 'postgresql'
 * // ctx.db       — SqliteDb | MysqlDb | PostgresDb
 * // ctx.users    — the users table for the active dialect
 * // ctx.tokens   — the tokens table for the active dialect
 * ```
 */
export function dialectCtx<K extends SchemaTableKey>(...tables: K[]): DialectCtxResult<K> {
  const dialect = getDialect()
  const raw = getRawDb()

  const schema = schemas[dialect]
  if (!schema) throw new Error(`Unsupported dialect: ${dialect}`)

  const result: Record<string, unknown> = { db: raw, dialect }
  for (const key of tables) {
    result[key] = schema[key]
  }
  return result as DialectCtxResult<K>
}
