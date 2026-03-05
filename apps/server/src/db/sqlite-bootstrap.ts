/**
 * SQLite schema bootstrap — runs CREATE TABLE IF NOT EXISTS for all tables.
 *
 * This is an intentional use of raw DDL (exception to the "no raw SQL" rule)
 * because Drizzle ORM does not provide a programmatic `CREATE TABLE` API.
 * The statements mirror the Drizzle schema in `schema/sqlite.ts` exactly.
 */

import type { Database } from 'bun:sqlite'

/**
 * Ensure every application table exists in the given SQLite database.
 * Safe to call on every startup — uses `CREATE TABLE IF NOT EXISTS`.
 */
export function ensureSqliteSchema(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      email TEXT,
      plex_token TEXT,
      "group" TEXT,
      group_id INTEGER,
      locked INTEGER,
      image TEXT,
      register_date TEXT,
      auth_service TEXT DEFAULT 'internal',
      totp_secret TEXT,
      totp_enabled INTEGER DEFAULT 0,
      totp_backup_codes TEXT
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS chatroom (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      gravatar TEXT,
      uid TEXT,
      date TEXT,
      ip TEXT,
      message TEXT
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE,
      user_id INTEGER,
      browser TEXT,
      ip TEXT,
      created TEXT,
      expires TEXT
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "group" TEXT UNIQUE,
      group_id INTEGER,
      image TEXT,
      "default" INTEGER
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "order" INTEGER,
      category TEXT UNIQUE,
      category_id INTEGER,
      image TEXT,
      "default" INTEGER
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS tabs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "order" INTEGER,
      category_id INTEGER,
      name TEXT,
      url TEXT,
      url_local TEXT,
      "default" INTEGER,
      enabled INTEGER,
      group_id INTEGER,
      group_id_max INTEGER DEFAULT 0,
      add_to_admin INTEGER DEFAULT 0,
      image TEXT,
      type INTEGER,
      splash INTEGER,
      ping INTEGER,
      ping_url TEXT,
      timeout INTEGER,
      timeout_ms INTEGER,
      preload INTEGER
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      value TEXT
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      date TEXT,
      email TEXT,
      username TEXT,
      dateused TEXT,
      usedby TEXT,
      ip TEXT,
      valid TEXT,
      type TEXT,
      invitedby TEXT
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS "BOOKMARK-categories" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "order" INTEGER,
      category TEXT UNIQUE,
      category_id INTEGER,
      "default" INTEGER
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS "BOOKMARK-tabs" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "order" INTEGER,
      category_id INTEGER,
      name TEXT,
      url TEXT,
      enabled INTEGER,
      group_id INTEGER,
      image TEXT,
      background_color TEXT,
      text_color TEXT
    )
  `)
}
