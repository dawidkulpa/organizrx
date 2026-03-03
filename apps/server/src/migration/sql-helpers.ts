/**
 * Dialect-aware raw SQL execution and column introspection helpers.
 *
 * These are used by the migration system which needs raw DDL (ALTER TABLE)
 * that Drizzle ORM does not support.  This is the only accepted exception
 * to the "no raw SQL" rule in AGENTS.md.
 */

import { getRawDb, type SqliteDb, type MysqlDb, type PostgresDb } from '../db'
import type { DatabaseDialect } from '../config/env'

/**
 * Execute a raw SQL statement (DDL / DML) against the app's DB connection.
 */
export async function execRawSql(dialect: DatabaseDialect, sqlStr: string): Promise<void> {
  const rawDb = getRawDb()

  switch (dialect) {
    case 'sqlite': {
      const db = rawDb as SqliteDb
      db.$client.exec(sqlStr)
      break
    }
    case 'mysql': {
      const db = rawDb as MysqlDb
      await db.$client.query(sqlStr)
      break
    }
    case 'postgresql': {
      const db = rawDb as PostgresDb
      await db.$client.unsafe(sqlStr)
      break
    }
  }
}

/**
 * Execute a raw SQL query and return rows.
 */
export async function queryRawSql(
  dialect: DatabaseDialect,
  sqlStr: string
): Promise<Record<string, unknown>[]> {
  const rawDb = getRawDb()

  switch (dialect) {
    case 'sqlite': {
      const db = rawDb as SqliteDb
      return db.$client.query(sqlStr).all() as Record<string, unknown>[]
    }
    case 'mysql': {
      const db = rawDb as MysqlDb
      const [rows] = await db.$client.query(sqlStr)
      return rows as Record<string, unknown>[]
    }
    case 'postgresql': {
      const db = rawDb as PostgresDb
      const rows = await db.$client.unsafe(sqlStr)
      return rows as Record<string, unknown>[]
    }
  }
}

/**
 * Get all column names for a given table.
 */
export async function getExistingColumns(
  dialect: DatabaseDialect,
  tableName: string
): Promise<string[]> {
  switch (dialect) {
    case 'sqlite': {
      const rows = await queryRawSql(dialect, `PRAGMA table_info("${tableName}")`)
      return rows.map((r) => String(r.name))
    }
    case 'mysql': {
      const rawDb = getRawDb() as MysqlDb
      const [rows] = await rawDb.$client.query(
        'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ?',
        [tableName]
      )
      return (rows as Array<{ COLUMN_NAME: string }>).map((r) => r.COLUMN_NAME)
    }
    case 'postgresql': {
      const rows = await queryRawSql(
        dialect,
        `SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}'`
      )
      return rows.map((r) => String(r.column_name))
    }
  }
}

/**
 * Check whether a specific column exists in a table.
 */
export async function columnExists(
  dialect: DatabaseDialect,
  tableName: string,
  columnName: string
): Promise<boolean> {
  const columns = await getExistingColumns(dialect, tableName)
  return columns.includes(columnName)
}
