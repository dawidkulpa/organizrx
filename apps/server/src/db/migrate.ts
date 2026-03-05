/**
 * Auto-migration runner for all supported dialects.
 *
 * Uses Drizzle Kit's `migrate()` helper which reads SQL migration files
 * from a configured directory and applies any that haven't run yet.
 *
 * Migration files are generated with `bunx drizzle-kit generate`.
 *
 * NOTE: The checked-in migration files are SQLite-only.  When the active
 * dialect is MySQL or PostgreSQL the database is assumed to already exist
 * (either from an old Organizr install or a manual setup).  The in-place
 * migration system (`src/migration/`) handles schema updates for those
 * dialects.  Drizzle migrations are therefore only applied for SQLite.
 */

import { migrate as migrateBunSqlite } from 'drizzle-orm/bun-sqlite/migrator'
import { existsSync } from 'node:fs'

import { getRawDb, getDialect } from './connection'
import type { SqliteDb } from './connection'

const DEFAULT_MIGRATIONS_DIR = './drizzle'

/**
 * Run pending migrations for the active dialect.
 *
 * For SQLite: applies SQL migration files from the migrations folder.
 * For MySQL / PostgreSQL: no-op — existing tables are expected, and the
 * in-place migrator handles any schema updates.
 *
 * @param migrationsFolder — path to the folder containing `.sql` migration
 *   files (default: `./drizzle`). The folder is resolved relative to CWD.
 */
export async function runMigrations(migrationsFolder = DEFAULT_MIGRATIONS_DIR): Promise<void> {
  const db = getRawDb()
  const dialect = getDialect()

  switch (dialect) {
    case 'sqlite': {
      if (!existsSync(migrationsFolder)) {
        // No migration files generated yet — schema is created by Drizzle push or wizard.
        break
      }
      migrateBunSqlite(db as unknown as SqliteDb, {
        migrationsFolder,
      })
      break
    }

    case 'mysql':
    case 'postgresql':
      // Tables already exist (old Organizr or manual setup).
      // Schema updates handled by src/migration/migrator.ts.
      break

    default:
      throw new Error(`Cannot run migrations: unsupported dialect "${dialect as string}"`)
  }
}
