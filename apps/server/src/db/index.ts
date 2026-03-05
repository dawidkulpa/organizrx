/**
 * Database module barrel export.
 *
 * Public API:
 *   initDb()      — create the connection (call once at startup)
 *   getDb()       — cached Drizzle instance
 *   getSchema()   — dialect-specific schema tables
 *   getDialect()  — active dialect string
 *   healthCheck() — SELECT 1 latency probe
 *   closeDb()     — tear down connection
 *   runMigrations() — apply pending Drizzle migrations
 */

export {
  initDb,
  getDb,
  getRawDb,
  getSchema,
  getDialect,
  healthCheck,
  closeDb,
  type DrizzleDb,
  type SqliteDb,
  type MysqlDb,
  type PostgresDb,
  type DbSchema,
  type InitDbOptions,
  type HealthCheckResult,
} from './connection'

export { runMigrations } from './migrate'

export { defaultGroups, seedDefaultGroups, type GroupSeed } from './seed'

export { dialectCtx } from './dialect-ctx'
