/**
 * MySQL schema bootstrap — runs CREATE TABLE IF NOT EXISTS for all tables.
 *
 * Intentional raw DDL (exception to the "no raw SQL" rule) because
 * Drizzle ORM has no programmatic CREATE TABLE API.
 * Mirrors the Drizzle schema in `schema/mysql.ts` exactly.
 */

import type { Pool } from 'mysql2/promise'

/**
 * Ensure every application table exists in the given MySQL database.
 * Safe to call on every startup — uses `CREATE TABLE IF NOT EXISTS`.
 */
export async function ensureMysqlSchema(pool: Pool): Promise<void> {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username TEXT,
      password TEXT,
      email TEXT,
      plex_token TEXT,
      \`group\` TEXT,
      group_id INT,
      locked INT,
      image TEXT,
      register_date DATETIME,
      auth_service VARCHAR(255) DEFAULT 'internal',
      totp_secret TEXT,
      totp_enabled INT DEFAULT 0,
      totp_backup_codes TEXT,
      UNIQUE KEY idx_users_username (username(255))
    )
  `)

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS chatroom (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username TEXT,
      gravatar TEXT,
      uid TEXT,
      date DATETIME,
      ip TEXT,
      message TEXT
    )
  `)

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      token TEXT,
      user_id INT,
      browser TEXT,
      ip TEXT,
      created DATETIME,
      expires DATETIME,
      UNIQUE KEY idx_tokens_token (token(255))
    )
  `)

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS \`groups\` (
      id INT AUTO_INCREMENT PRIMARY KEY,
      \`group\` TEXT,
      group_id INT,
      image TEXT,
      \`default\` INT,
      UNIQUE KEY idx_groups_group (\`group\`(255))
    )
  `)

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      \`order\` INT,
      category TEXT,
      category_id INT,
      image TEXT,
      \`default\` INT,
      UNIQUE KEY idx_categories_category (category(255))
    )
  `)

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS tabs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      \`order\` INT,
      category_id INT,
      name TEXT,
      url TEXT,
      url_local TEXT,
      \`default\` INT,
      enabled INT,
      group_id INT,
      group_id_max INT DEFAULT 0,
      add_to_admin INT DEFAULT 0,
      image TEXT,
      type INT,
      splash INT,
      ping INT,
      ping_url TEXT,
      timeout INT,
      timeout_ms INT,
      preload INT
    )
  `)

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS options (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name TEXT,
      value TEXT,
      UNIQUE KEY idx_options_name (name(255))
    )
  `)

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS invites (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code TEXT,
      date DATETIME,
      email TEXT,
      username TEXT,
      dateused DATETIME,
      usedby TEXT,
      ip TEXT,
      valid TEXT,
      type TEXT,
      invitedby TEXT,
      UNIQUE KEY idx_invites_code (code(255))
    )
  `)

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS \`BOOKMARK-categories\` (
      id INT AUTO_INCREMENT PRIMARY KEY,
      \`order\` INT,
      category TEXT,
      category_id INT,
      \`default\` INT,
      UNIQUE KEY idx_bm_categories_category (category(255))
    )
  `)

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS \`BOOKMARK-tabs\` (
      id INT AUTO_INCREMENT PRIMARY KEY,
      \`order\` INT,
      category_id INT,
      name TEXT,
      url TEXT,
      enabled INT,
      group_id INT,
      image TEXT,
      background_color TEXT,
      text_color TEXT
    )
  `)
}
