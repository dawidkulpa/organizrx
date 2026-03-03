/**
 * Schema diff definitions for in-place migration.
 *
 * OrganizrX connects to the SAME database the old Organizr used and performs
 * in-place ALTER TABLE operations to bring the schema up to date.  The only
 * differences between old Organizr and OrganizrX are three new columns on the
 * `users` table (TOTP support).
 */

export interface ColumnAddition {
  /** Column name to add */
  name: string
  /** SQL type (TEXT, INTEGER, etc.) */
  type: string
  /** DEFAULT clause value (as raw SQL literal) */
  defaultValue?: string
  /** Whether the column accepts NULL */
  nullable?: boolean
}

export interface SchemaMigration {
  /** Table to alter */
  table: string
  /** Columns to add via ALTER TABLE */
  addColumns: ColumnAddition[]
}

/**
 * Schema migrations that bring an old Organizr DB up to OrganizrX spec.
 * Currently only the `users` table needs new columns for TOTP 2FA.
 */
export const schemaMigrations: SchemaMigration[] = [
  {
    table: 'users',
    addColumns: [
      { name: 'totp_secret', type: 'TEXT', nullable: true },
      { name: 'totp_enabled', type: 'INTEGER', defaultValue: '0' },
      { name: 'totp_backup_codes', type: 'TEXT', nullable: true },
    ],
  },
]

/**
 * Data transforms to run after schema changes.
 * Each entry is a raw SQL statement executed against the app's own DB.
 */
export const DATA_TRANSFORMS = [
  {
    description: 'Swap PHP bcrypt $2y$ prefix to Node.js $2a$ (functionally identical)',
    sql: "UPDATE users SET password = REPLACE(password, '$2y$', '$2a$') WHERE password LIKE '$2y$%'",
  },
]

/**
 * Tables whose data should be cleared during migration.
 * Old PHP session tokens are invalid under the new JWT auth system.
 */
export const TABLES_TO_CLEAR = ['tokens']

/** Migration completion marker key stored in the options table. */
export const MIGRATION_COMPLETED_KEY = '_migration_completed'

// PHP bcrypt uses $2y$ prefix, Node.js uses $2a$ — functionally identical.
// Kept as a utility for tests.
export function swapBcryptPrefix(value: unknown): unknown {
  if (typeof value !== 'string') return value
  if (value.startsWith('$2y$')) {
    return '$2a$' + value.slice(4)
  }
  return value
}
