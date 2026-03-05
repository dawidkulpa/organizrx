/**
 * PostgreSQL schema bootstrap — runs CREATE TABLE IF NOT EXISTS for all tables.
 *
 * Intentional raw DDL (exception to the "no raw SQL" rule) because
 * Drizzle ORM has no programmatic CREATE TABLE API.
 * Mirrors the Drizzle schema in `schema/pg.ts` exactly.
 */

import type { Sql } from 'postgres'

/**
 * Ensure every application table exists in the given PostgreSQL database.
 * Safe to call on every startup — uses `CREATE TABLE IF NOT EXISTS`.
 */
export async function ensurePgSchema(client: Sql): Promise<void> {
  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      email TEXT,
      plex_token TEXT,
      "group" TEXT,
      group_id INTEGER,
      locked INTEGER,
      image TEXT,
      register_date TIMESTAMP,
      auth_service TEXT DEFAULT 'internal',
      totp_secret TEXT,
      totp_enabled INTEGER DEFAULT 0,
      totp_backup_codes TEXT
    )
  `)

  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS chatroom (
      id SERIAL PRIMARY KEY,
      username TEXT,
      gravatar TEXT,
      uid TEXT,
      date TIMESTAMP,
      ip TEXT,
      message TEXT
    )
  `)

  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS tokens (
      id SERIAL PRIMARY KEY,
      token TEXT UNIQUE,
      user_id INTEGER,
      browser TEXT,
      ip TEXT,
      created TIMESTAMP,
      expires TIMESTAMP
    )
  `)

  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS groups (
      id SERIAL PRIMARY KEY,
      "group" TEXT UNIQUE,
      group_id INTEGER,
      image TEXT,
      "default" INTEGER
    )
  `)

  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      "order" INTEGER,
      category TEXT UNIQUE,
      category_id INTEGER,
      image TEXT,
      "default" INTEGER
    )
  `)

  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS tabs (
      id SERIAL PRIMARY KEY,
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

  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS options (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE,
      value TEXT
    )
  `)

  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS invites (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE,
      date TIMESTAMP,
      email TEXT,
      username TEXT,
      dateused TIMESTAMP,
      usedby TEXT,
      ip TEXT,
      valid TEXT,
      type TEXT,
      invitedby TEXT
    )
  `)

  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS "BOOKMARK-categories" (
      id SERIAL PRIMARY KEY,
      "order" INTEGER,
      category TEXT UNIQUE,
      category_id INTEGER,
      "default" INTEGER
    )
  `)

  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS "BOOKMARK-tabs" (
      id SERIAL PRIMARY KEY,
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
