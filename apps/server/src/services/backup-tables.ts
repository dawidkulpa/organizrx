import { getRawDb, getDialect, type SqliteDb, type MysqlDb, type PostgresDb } from '../db'
import * as sqliteSchema from '../db/schema/sqlite'
import * as mysqlSchema from '../db/schema/mysql'
import * as pgSchema from '../db/schema/pg'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BackupMetadata {
  version: string
  createdAt: string
  dialect: string
  tables: string[]
  description?: string
}

export interface BackupInfo {
  filename: string
  createdAt: string
  sizeBytes: number
  metadata: BackupMetadata
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Table names matching the DB schema
export const TABLE_NAMES = [
  'users',
  'groups',
  'tokens',
  'options',
  'tabs',
  'categories',
  'invites',
  'chatroom',
  'BOOKMARK-categories',
  'BOOKMARK-tabs',
] as const

// ---------------------------------------------------------------------------
// Dialect helpers — per-dialect table selection avoids union type issues
// ---------------------------------------------------------------------------

export function getSqliteTable(tableName: string) {
  switch (tableName) {
    case 'users':
      return sqliteSchema.users
    case 'groups':
      return sqliteSchema.groups
    case 'tokens':
      return sqliteSchema.tokens
    case 'options':
      return sqliteSchema.options
    case 'tabs':
      return sqliteSchema.tabs
    case 'categories':
      return sqliteSchema.categories
    case 'invites':
      return sqliteSchema.invites
    case 'chatroom':
      return sqliteSchema.chatroom
    case 'BOOKMARK-categories':
      return sqliteSchema.bookmarkCategories
    case 'BOOKMARK-tabs':
      return sqliteSchema.bookmarkTabs
    default:
      return null
  }
}

export function getMysqlTable(tableName: string) {
  switch (tableName) {
    case 'users':
      return mysqlSchema.users
    case 'groups':
      return mysqlSchema.groups
    case 'tokens':
      return mysqlSchema.tokens
    case 'options':
      return mysqlSchema.options
    case 'tabs':
      return mysqlSchema.tabs
    case 'categories':
      return mysqlSchema.categories
    case 'invites':
      return mysqlSchema.invites
    case 'chatroom':
      return mysqlSchema.chatroom
    case 'BOOKMARK-categories':
      return mysqlSchema.bookmarkCategories
    case 'BOOKMARK-tabs':
      return mysqlSchema.bookmarkTabs
    default:
      return null
  }
}

export function getPgTable(tableName: string) {
  switch (tableName) {
    case 'users':
      return pgSchema.users
    case 'groups':
      return pgSchema.groups
    case 'tokens':
      return pgSchema.tokens
    case 'options':
      return pgSchema.options
    case 'tabs':
      return pgSchema.tabs
    case 'categories':
      return pgSchema.categories
    case 'invites':
      return pgSchema.invites
    case 'chatroom':
      return pgSchema.chatroom
    case 'BOOKMARK-categories':
      return pgSchema.bookmarkCategories
    case 'BOOKMARK-tabs':
      return pgSchema.bookmarkTabs
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Export all table data (dialect-specific to avoid union type issues)
// ---------------------------------------------------------------------------

export async function exportAllTables(): Promise<Record<string, unknown[]>> {
  const dialect = getDialect()
  const raw = getRawDb()
  const data: Record<string, unknown[]> = {}

  switch (dialect) {
    case 'sqlite': {
      const db = raw as SqliteDb
      for (const tableName of TABLE_NAMES) {
        const table = getSqliteTable(tableName)
        if (!table) continue
        data[tableName] = db.select().from(table).all()
      }
      break
    }
    case 'mysql': {
      const db = raw as MysqlDb
      for (const tableName of TABLE_NAMES) {
        const table = getMysqlTable(tableName)
        if (!table) continue
        data[tableName] = await db.select().from(table)
      }
      break
    }
    case 'postgresql': {
      const db = raw as PostgresDb
      for (const tableName of TABLE_NAMES) {
        const table = getPgTable(tableName)
        if (!table) continue
        data[tableName] = await db.select().from(table)
      }
      break
    }
    default:
      throw new Error(`Unsupported dialect: ${dialect}`)
  }

  return data
}
