import { join, basename } from 'node:path'
import { mkdir, readdir, unlink, stat } from 'node:fs/promises'
import AdmZip from 'adm-zip'

import { getRawDb, getDialect, type SqliteDb, type MysqlDb, type PostgresDb } from '../db'
import { getSettingNumber } from './settings'
import {
  TABLE_NAMES,
  getSqliteTable,
  getMysqlTable,
  getPgTable,
  exportAllTables,
  type BackupMetadata,
  type BackupInfo,
} from './backup-tables'

// Constants
const BACKUP_DIR = join(process.cwd(), 'data', 'backups')
const APP_VERSION = '0.0.1'
const DEFAULT_MAX_BACKUPS = 10

// Ensure backup directory
async function ensureBackupDir(): Promise<void> {
  await mkdir(BACKUP_DIR, { recursive: true })
}

// Create backup
export async function createBackup(description?: string): Promise<BackupInfo> {
  await ensureBackupDir()

  const now = new Date()
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '-')
  const filename = `organizrx-backup-${timestamp}.zip`
  const filepath = join(BACKUP_DIR, filename)

  // Export table data
  const tableData = await exportAllTables()

  const dialect = getDialect()

  // Build metadata
  const metadata: BackupMetadata = {
    version: APP_VERSION,
    createdAt: now.toISOString(),
    dialect,
    tables: Object.keys(tableData),
    description,
  }

  // Create zip
  const zip = new AdmZip()
  zip.addFile('metadata.json', Buffer.from(JSON.stringify(metadata, null, 2)))
  zip.addFile('data.json', Buffer.from(JSON.stringify(tableData, null, 2)))

  // For SQLite, also include a copy of the raw DB file
  if (dialect === 'sqlite') {
    const db = getRawDb() as SqliteDb
    const dbPath = db.$client.filename
    if (dbPath && dbPath !== ':memory:') {
      const dbFile = Bun.file(dbPath)
      const dbBuffer = Buffer.from(await dbFile.arrayBuffer())
      zip.addFile('database.sqlite', dbBuffer)
    }
  }

  // Write zip to disk
  await Bun.write(filepath, zip.toBuffer())

  // Apply retention policy
  await applyRetention()

  const stats = await stat(filepath)
  return {
    filename,
    createdAt: now.toISOString(),
    sizeBytes: stats.size,
    metadata,
  }
}

// List backups
export async function listBackups(): Promise<BackupInfo[]> {
  await ensureBackupDir()

  const files = await readdir(BACKUP_DIR)
  const zipFiles = files.filter((f) => f.endsWith('.zip') && f.startsWith('organizrx-backup-'))

  const backups: BackupInfo[] = []

  for (const filename of zipFiles) {
    const filepath = join(BACKUP_DIR, filename)
    try {
      const zip = new AdmZip(filepath)
      const metadataEntry = zip.getEntry('metadata.json')
      if (!metadataEntry) continue

      const metadata = JSON.parse(metadataEntry.getData().toString('utf-8')) as BackupMetadata
      const stats = await stat(filepath)

      backups.push({
        filename,
        createdAt: metadata.createdAt,
        sizeBytes: stats.size,
        metadata,
      })
    } catch {
      // Skip corrupt/invalid zip files
      continue
    }
  }

  // Sort by date descending
  backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return backups
}

// Get backup file path (for download)
export async function getBackupPath(filename: string): Promise<string | null> {
  // Sanitize filename — prevent directory traversal
  const safe = basename(filename)
  if (!safe.endsWith('.zip') || !safe.startsWith('organizrx-backup-')) {
    return null
  }

  const filepath = join(BACKUP_DIR, safe)
  try {
    await stat(filepath)
    return filepath
  } catch {
    return null
  }
}

// Delete backup
export async function deleteBackup(filename: string): Promise<boolean> {
  const filepath = await getBackupPath(filename)
  if (!filepath) return false

  try {
    await unlink(filepath)
    return true
  } catch {
    return false
  }
}

// Restore backup (dialect-specific)
export async function restoreBackup(
  zipBuffer: Buffer
): Promise<{ tables: string[]; rowCounts: Record<string, number> }> {
  const zip = new AdmZip(zipBuffer)

  // Validate metadata
  const metadataEntry = zip.getEntry('metadata.json')
  if (!metadataEntry) {
    throw new Error('Invalid backup: missing metadata.json')
  }

  const metadata = JSON.parse(metadataEntry.getData().toString('utf-8')) as BackupMetadata

  if (!metadata.version) {
    throw new Error('Invalid backup: missing version in metadata')
  }

  // Check data.json
  const dataEntry = zip.getEntry('data.json')
  if (!dataEntry) {
    throw new Error('Invalid backup: missing data.json')
  }

  const tableData = JSON.parse(dataEntry.getData().toString('utf-8')) as Record<string, unknown[]>

  const dialect = getDialect()
  const raw = getRawDb()
  const restoredTables: string[] = []
  const rowCounts: Record<string, number> = {}

  // Restore tables: delete existing data, then insert from backup
  switch (dialect) {
    case 'sqlite': {
      const db = raw as SqliteDb
      for (const tableName of TABLE_NAMES) {
        const rows = tableData[tableName]
        if (!rows || !Array.isArray(rows)) continue

        const table = getSqliteTable(tableName)
        if (!table) continue

        db.delete(table).run()

        if (rows.length > 0) {
          for (const row of rows) {
            db.insert(table)
              .values(row as Record<string, unknown>)
              .run()
          }
        }

        restoredTables.push(tableName)
        rowCounts[tableName] = rows.length
      }
      break
    }
    case 'mysql': {
      const db = raw as MysqlDb
      for (const tableName of TABLE_NAMES) {
        const rows = tableData[tableName]
        if (!rows || !Array.isArray(rows)) continue

        const table = getMysqlTable(tableName)
        if (!table) continue

        await db.delete(table)

        if (rows.length > 0) {
          for (const row of rows) {
            await db.insert(table).values(row as Record<string, unknown>)
          }
        }

        restoredTables.push(tableName)
        rowCounts[tableName] = rows.length
      }
      break
    }
    case 'postgresql': {
      const db = raw as PostgresDb
      for (const tableName of TABLE_NAMES) {
        const rows = tableData[tableName]
        if (!rows || !Array.isArray(rows)) continue

        const table = getPgTable(tableName)
        if (!table) continue

        await db.delete(table)

        if (rows.length > 0) {
          for (const row of rows) {
            await db.insert(table).values(row as Record<string, unknown>)
          }
        }

        restoredTables.push(tableName)
        rowCounts[tableName] = rows.length
      }
      break
    }
    default:
      throw new Error(`Unsupported dialect: ${dialect}`)
  }

  return { tables: restoredTables, rowCounts }
}

// Retention policy
async function applyRetention(): Promise<void> {
  const maxBackups = await getSettingNumber('BACKUP_MAX_COUNT', DEFAULT_MAX_BACKUPS)

  const backups = await listBackups()

  if (backups.length <= maxBackups) return

  // Delete oldest backups beyond the limit
  const toDelete = backups.slice(maxBackups)
  for (const b of toDelete) {
    await deleteBackup(b.filename)
  }
}

// Testing helpers
export function _getBackupDir(): string {
  return BACKUP_DIR
}

export type { BackupMetadata, BackupInfo }
