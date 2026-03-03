import { Database } from 'bun:sqlite'
import { copyFileSync, existsSync } from 'node:fs'
import { getRawDb, getDialect, type SqliteDb, type MysqlDb, type PostgresDb } from '../db'
import * as sqliteSchema from '../db/schema/sqlite'
import * as mysqlSchema from '../db/schema/mysql'
import * as pgSchema from '../db/schema/pg'
import { migratedTables, type TableMapping } from './column-map'
import { createBackup } from './backup'
import { detectOldDb } from './detector'

export type ProgressCallback = (table: string, current: number, total: number) => void

export interface MigrationResult {
  success: boolean
  tablesProcessed: string[]
  tablesSkipped: string[]
  totalRows: number
  backupPath: string | null
  error?: string
  durationMs: number
}

export interface MigrationStatus {
  detected: boolean
  path: string | null
  configVersion: string | null
  alreadyMigrated: boolean
  error?: string
}

const MIGRATION_COMPLETED_KEY = '_migration_completed'

function getSchemaTable(tableName: string, dialect: string) {
  const schemaMap: Record<string, Record<string, unknown>> = {
    sqlite: sqliteSchema,
    mysql: mysqlSchema,
    postgresql: pgSchema,
  }
  const schema = schemaMap[dialect]
  if (!schema) throw new Error(`Unsupported dialect: ${dialect}`)

  const nameMap: Record<string, string> = {
    users: 'users',
    chatroom: 'chatroom',
    tokens: 'tokens',
    groups: 'groups',
    categories: 'categories',
    tabs: 'tabs',
    options: 'options',
    invites: 'invites',
    'BOOKMARK-categories': 'bookmarkCategories',
    'BOOKMARK-tabs': 'bookmarkTabs',
  }

  const schemaKey = nameMap[tableName]
  if (!schemaKey || !schema[schemaKey]) {
    throw new Error(`No schema found for table: ${tableName}`)
  }

  return schema[schemaKey]
}

function readOldTable(oldDb: Database, tableName: string): Record<string, unknown>[] {
  try {
    const rows = oldDb.query(`SELECT * FROM "${tableName}"`).all()
    return rows as Record<string, unknown>[]
  } catch {
    return []
  }
}

function mapRow(row: Record<string, unknown>, mapping: TableMapping): Record<string, unknown> {
  const mapped: Record<string, unknown> = {}

  for (const col of mapping.columns) {
    let value = row[col.oldColumn]
    if (col.transform) {
      value = col.transform(value)
    }
    mapped[col.newColumn] = value
  }

  if (mapping.defaults) {
    for (const [key, defaultValue] of Object.entries(mapping.defaults)) {
      if (!(key in mapped)) {
        mapped[key] = defaultValue
      }
    }
  }

  return mapped
}

async function insertRows(
  dialect: string,
  tableName: string,
  rows: Record<string, unknown>[]
): Promise<void> {
  if (rows.length === 0) return

  const table = getSchemaTable(tableName, dialect)
  const rawDb = getRawDb()

  for (const row of rows) {
    switch (dialect) {
      case 'sqlite': {
        const db = rawDb as SqliteDb
        await db
          .insert(table as typeof sqliteSchema.users)
          .values(row)
          .onConflictDoNothing()
        break
      }
      case 'mysql': {
        const db = rawDb as MysqlDb
        await db
          .insert(table as typeof mysqlSchema.users)
          .values(row)
          .onDuplicateKeyUpdate({ set: row })
        break
      }
      case 'postgresql': {
        const db = rawDb as PostgresDb
        await db
          .insert(table as typeof pgSchema.users)
          .values(row)
          .onConflictDoNothing()
        break
      }
    }
  }
}

export async function getMigrationStatus(legacyDbPath?: string): Promise<MigrationStatus> {
  const detection = detectOldDb(legacyDbPath)

  if (!detection.found || !detection.path) {
    return {
      detected: false,
      path: null,
      configVersion: null,
      alreadyMigrated: false,
      error: detection.error,
    }
  }

  let alreadyMigrated = false
  try {
    const dialect = getDialect()
    const rawDb = getRawDb()
    const optionsTable = getSchemaTable('options', dialect)

    let rows: unknown[]
    switch (dialect) {
      case 'sqlite': {
        const db = rawDb as SqliteDb
        rows = db
          .select()
          .from(optionsTable as typeof sqliteSchema.options)
          .all()
        break
      }
      case 'mysql': {
        const db = rawDb as MysqlDb
        rows = await db.select().from(optionsTable as typeof mysqlSchema.options)
        break
      }
      case 'postgresql': {
        const db = rawDb as PostgresDb
        rows = await db.select().from(optionsTable as typeof pgSchema.options)
        break
      }
      default:
        rows = []
    }

    alreadyMigrated = (rows as Array<{ name: string | null }>).some(
      (r) => r.name === MIGRATION_COMPLETED_KEY
    )
  } catch {
  }

  return {
    detected: true,
    path: detection.path,
    configVersion: detection.configVersion,
    alreadyMigrated,
  }
}

export async function runMigration(
  legacyDbPath?: string,
  onProgress?: ProgressCallback
): Promise<MigrationResult> {
  const start = performance.now()
  const tablesProcessed: string[] = []
  const tablesSkipped: string[] = []
  let totalRows = 0
  let backupPath: string | null = null

  const status = await getMigrationStatus(legacyDbPath)

  if (!status.detected || !status.path) {
    return {
      success: false,
      tablesProcessed: [],
      tablesSkipped: [],
      totalRows: 0,
      backupPath: null,
      error: 'No legacy Organizr database found',
      durationMs: Math.round(performance.now() - start),
    }
  }

  if (status.alreadyMigrated) {
    return {
      success: true,
      tablesProcessed: [],
      tablesSkipped: [],
      totalRows: 0,
      backupPath: null,
      error: 'Migration already completed',
      durationMs: Math.round(performance.now() - start),
    }
  }

  try {
    backupPath = createBackup(status.path)
  } catch (err) {
    return {
      success: false,
      tablesProcessed: [],
      tablesSkipped: [],
      totalRows: 0,
      backupPath: null,
      error: `Backup failed: ${err instanceof Error ? err.message : String(err)}`,
      durationMs: Math.round(performance.now() - start),
    }
  }

  const dialect = getDialect()

  let oldDb: Database | null = null
  try {
    oldDb = new Database(status.path, { readonly: true })
  } catch (err) {
    return {
      success: false,
      tablesProcessed: [],
      tablesSkipped: [],
      totalRows: 0,
      backupPath,
      error: `Failed to open legacy DB: ${err instanceof Error ? err.message : String(err)}`,
      durationMs: Math.round(performance.now() - start),
    }
  }

  try {
    for (const tableMapping of migratedTables) {
      const oldRows = readOldTable(oldDb, tableMapping.oldTable)

      if (oldRows.length === 0) {
        tablesSkipped.push(tableMapping.oldTable)
        onProgress?.(tableMapping.oldTable, 0, 0)
        continue
      }

      const mappedRows = oldRows.map((row) => mapRow(row, tableMapping))

      for (let i = 0; i < mappedRows.length; i++) {
        await insertRows(dialect, tableMapping.newTable, [mappedRows[i]])
        totalRows++
        onProgress?.(tableMapping.oldTable, i + 1, mappedRows.length)
      }

      tablesProcessed.push(tableMapping.oldTable)
    }

    const timestamp = new Date().toISOString()
    await insertRows(dialect, 'options', [{ name: MIGRATION_COMPLETED_KEY, value: timestamp }])

    oldDb.close()

    return {
      success: true,
      tablesProcessed,
      tablesSkipped,
      totalRows,
      backupPath,
      durationMs: Math.round(performance.now() - start),
    }
  } catch (err) {
    if (oldDb) {
      try {
        oldDb.close()
      } catch {
        /* noop */
      }
    }

    if (backupPath && existsSync(backupPath)) {
      try {
        copyFileSync(backupPath, status.path)
      } catch {
      }
    }

    return {
      success: false,
      tablesProcessed,
      tablesSkipped,
      totalRows,
      backupPath,
      error: `Migration failed: ${err instanceof Error ? err.message : String(err)}`,
      durationMs: Math.round(performance.now() - start),
    }
  }
}
