/**
 * Auto-migration runner for all supported dialects.
 *
 * Uses Drizzle Kit's `migrate()` helper which reads SQL migration files
 * from a configured directory and applies any that haven't run yet.
 *
 * Migration files are generated with `bunx drizzle-kit generate`.
 */

import { migrate as migrateBunSqlite } from 'drizzle-orm/bun-sqlite/migrator'
import { migrate as migrateMysql } from 'drizzle-orm/mysql2/migrator'
import { migrate as migratePostgres } from 'drizzle-orm/postgres-js/migrator'

import { getRawDb, getDialect } from './connection'
import type { SqliteDb, MysqlDb, PostgresDb } from './connection'

const DEFAULT_MIGRATIONS_DIR = './drizzle'

/**
 * Run pending migrations for the active dialect.
 *
 * @param migrationsFolder — path to the folder containing `.sql` migration
 *   files (default: `./drizzle`). The folder is resolved relative to CWD.
 */
export async function runMigrations(migrationsFolder = DEFAULT_MIGRATIONS_DIR): Promise<void> {
  const db = getRawDb()
  const dialect = getDialect()

  switch (dialect) {
    case 'sqlite':
      migrateBunSqlite(db as unknown as SqliteDb, {
        migrationsFolder,
      })
      break

    case 'mysql':
      await migrateMysql(db as unknown as MysqlDb, {
        migrationsFolder,
      })
      break

    case 'postgresql':
      await migratePostgres(db as unknown as PostgresDb, {
        migrationsFolder,
      })
      break

    default:
      throw new Error(`Cannot run migrations: unsupported dialect "${dialect as string}"`)
  }
}
