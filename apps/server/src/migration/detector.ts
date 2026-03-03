
import { existsSync } from 'node:fs'
import { Database } from 'bun:sqlite'

export interface DetectionResult {
  /** Whether an old Organizr DB was found */
  found: boolean
  /** Resolved path to the old DB file */
  path: string | null
  /** CONFIG_VERSION value from the options table */
  configVersion: string | null
  /** Error message if detection failed mid-check */
  error?: string
}

const DEFAULT_PATHS = ['/config/www/db/organizr.db', './organizr.db']

/**
 * Detect an old Organizr SQLite database file on disk.
 *
 * This is used to find the DB file path for backup purposes.
 * It does NOT need a separate DB connection — it opens the file
 * read-only just to check if it has an options table.
 */
export function detectOldDb(legacyDbPath?: string): DetectionResult {
  const candidatePaths = legacyDbPath ? [legacyDbPath] : DEFAULT_PATHS

  for (const dbPath of candidatePaths) {
    if (!existsSync(dbPath)) continue

    let db: Database | null = null
    try {
      db = new Database(dbPath, { readonly: true })

      // Check if the options table exists
      const tableCheck = db
        .query<
          { name: string },
          []
        >("SELECT name FROM sqlite_master WHERE type='table' AND name='options'")
        .get()

      if (!tableCheck) {
        db.close()
        continue
      }

      // Look for CONFIG_VERSION in the options table
      const configRow = db
        .query<{ value: string }, [string]>('SELECT value FROM options WHERE name = ?')
        .get('CONFIG_VERSION')

      db.close()

      return {
        found: true,
        path: dbPath,
        configVersion: configRow?.value ?? null,
      }
    } catch (err) {
      if (db) {
        try {
          db.close()
        } catch {
          /* already closing */
        }
      }
      return {
        found: false,
        path: dbPath,
        configVersion: null,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  return {
    found: false,
    path: null,
    configVersion: null,
  }
}
