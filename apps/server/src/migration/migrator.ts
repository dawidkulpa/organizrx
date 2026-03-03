/**
 * In-place schema migrator.
 *
 * OrganizrX connects to the SAME database the old Organizr used.  This module
 * detects whether the connected DB has an old Organizr schema (missing TOTP
 * columns), and performs ALTER TABLE operations to bring it up to date.
 *
 * No cross-database copying — everything happens in the app's own connection.
 */

import { existsSync, copyFileSync } from 'node:fs'
import { getDialect } from '../db'
import type { DatabaseDialect } from '../config/env'
import { createBackup } from './backup'
import { execRawSql, queryRawSql, columnExists } from './sql-helpers'
import {
  schemaMigrations,
  DATA_TRANSFORMS,
  TABLES_TO_CLEAR,
  MIGRATION_COMPLETED_KEY,
} from './column-map'

export type ProgressCallback = (step: string, current: number, total: number) => void

export interface MigrationResult {
  success: boolean
  columnsAdded: string[]
  tablesCleared: string[]
  transformsApplied: string[]
  backupPath: string | null
  error?: string
  durationMs: number
}

export interface MigrationStatus {
  /** Whether the connected DB needs an in-place schema update */
  needsMigration: boolean
  /** Whether migration was already completed */
  alreadyMigrated: boolean
  /** CONFIG_VERSION from the options table, if found */
  configVersion: string | null
  /** Which columns are missing (empty = schema is current) */
  missingColumns: string[]
  error?: string
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function checkAlreadyMigrated(dialect: DatabaseDialect): Promise<boolean> {
  try {
    const rows = await queryRawSql(dialect, 'SELECT name FROM options')
    return rows.some((r) => r.name === MIGRATION_COMPLETED_KEY)
  } catch {
    return false
  }
}

async function getConfigVersion(dialect: DatabaseDialect): Promise<string | null> {
  try {
    const rows = await queryRawSql(
      dialect,
      "SELECT value FROM options WHERE name = 'CONFIG_VERSION'"
    )
    if (rows.length > 0) return String(rows[0].value)
    return null
  } catch {
    return null
  }
}

async function findMissingColumns(dialect: DatabaseDialect): Promise<string[]> {
  const missing: string[] = []

  for (const migration of schemaMigrations) {
    for (const col of migration.addColumns) {
      const exists = await columnExists(dialect, migration.table, col.name)
      if (!exists) {
        missing.push(`${migration.table}.${col.name}`)
      }
    }
  }

  return missing
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether the connected database needs an in-place schema migration.
 * Uses the app's own DB connection — no external paths needed.
 */
export async function getMigrationStatus(): Promise<MigrationStatus> {
  try {
    const dialect = getDialect()
    const alreadyMigrated = await checkAlreadyMigrated(dialect)

    if (alreadyMigrated) {
      return {
        needsMigration: false,
        alreadyMigrated: true,
        configVersion: await getConfigVersion(dialect),
        missingColumns: [],
      }
    }

    const configVersion = await getConfigVersion(dialect)
    const missingColumns = await findMissingColumns(dialect)

    // DB needs migration if it has CONFIG_VERSION (old Organizr marker)
    // OR if it's missing TOTP columns
    const needsMigration = configVersion !== null || missingColumns.length > 0

    return {
      needsMigration,
      alreadyMigrated: false,
      configVersion,
      missingColumns,
    }
  } catch (err) {
    return {
      needsMigration: false,
      alreadyMigrated: false,
      configVersion: null,
      missingColumns: [],
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Run in-place schema migration on the connected database.
 *
 * 1. Backup (SQLite only: copy file)
 * 2. ALTER TABLE ADD COLUMN for each missing column
 * 3. Run data transforms (bcrypt prefix swap)
 * 4. Clear invalidated tables (tokens)
 * 5. Mark migration as completed in options table
 */
export async function runMigration(
  onProgress?: ProgressCallback,
  dbFilePath?: string
): Promise<MigrationResult> {
  const start = performance.now()
  const columnsAdded: string[] = []
  const tablesCleared: string[] = []
  const transformsApplied: string[] = []
  let backupPath: string | null = null

  try {
    const dialect = getDialect()

    // Check if already migrated
    const alreadyMigrated = await checkAlreadyMigrated(dialect)
    if (alreadyMigrated) {
      return {
        success: true,
        columnsAdded: [],
        tablesCleared: [],
        transformsApplied: [],
        backupPath: null,
        error: 'Migration already completed',
        durationMs: Math.round(performance.now() - start),
      }
    }

    // Calculate total steps for progress reporting
    const totalSteps =
      schemaMigrations.reduce((sum, m) => sum + m.addColumns.length, 0) +
      DATA_TRANSFORMS.length +
      TABLES_TO_CLEAR.length +
      1 // final marker
    let currentStep = 0

    // Step 1: Backup (SQLite only)
    if (dialect === 'sqlite' && dbFilePath && existsSync(dbFilePath)) {
      try {
        backupPath = createBackup(dbFilePath)
      } catch (err) {
        return {
          success: false,
          columnsAdded: [],
          tablesCleared: [],
          transformsApplied: [],
          backupPath: null,
          error: `Backup failed: ${err instanceof Error ? err.message : String(err)}`,
          durationMs: Math.round(performance.now() - start),
        }
      }
    }

    // Step 2: ALTER TABLE ADD COLUMN for missing columns
    for (const migration of schemaMigrations) {
      for (const col of migration.addColumns) {
        const exists = await columnExists(dialect, migration.table, col.name)
        if (!exists) {
          let ddl = `ALTER TABLE "${migration.table}" ADD COLUMN "${col.name}" ${col.type}`
          if (col.defaultValue !== undefined) {
            ddl += ` DEFAULT ${col.defaultValue}`
          } else if (col.nullable) {
            ddl += ' DEFAULT NULL'
          }
          await execRawSql(dialect, ddl)
          columnsAdded.push(`${migration.table}.${col.name}`)
        }
        currentStep++
        onProgress?.('Adding columns', currentStep, totalSteps)
      }
    }

    // Step 3: Data transforms
    for (const transform of DATA_TRANSFORMS) {
      await execRawSql(dialect, transform.sql)
      transformsApplied.push(transform.description)
      currentStep++
      onProgress?.('Applying transforms', currentStep, totalSteps)
    }

    // Step 4: Clear invalidated tables
    for (const table of TABLES_TO_CLEAR) {
      await execRawSql(dialect, `DELETE FROM "${table}"`)
      tablesCleared.push(table)
      currentStep++
      onProgress?.('Clearing old data', currentStep, totalSteps)
    }

    // Step 5: Mark migration as completed
    const timestamp = new Date().toISOString()
    await execRawSql(
      dialect,
      `INSERT INTO options (name, value) VALUES ('${MIGRATION_COMPLETED_KEY}', '${timestamp}')`
    )
    currentStep++
    onProgress?.('Finalizing', currentStep, totalSteps)

    return {
      success: true,
      columnsAdded,
      tablesCleared,
      transformsApplied,
      backupPath,
      durationMs: Math.round(performance.now() - start),
    }
  } catch (err) {
    // On SQLite failure, attempt to restore from backup
    if (backupPath && dbFilePath && existsSync(backupPath)) {
      try {
        copyFileSync(backupPath, dbFilePath)
      } catch {
        /* best-effort restore */
      }
    }

    return {
      success: false,
      columnsAdded,
      tablesCleared,
      transformsApplied,
      backupPath,
      error: `Migration failed: ${err instanceof Error ? err.message : String(err)}`,
      durationMs: Math.round(performance.now() - start),
    }
  }
}
