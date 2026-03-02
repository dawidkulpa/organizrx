import { eq } from 'drizzle-orm'
import type { z } from 'zod'

/**
 * Known runtime setting keys stored in the options table.
 * These are user-editable settings that can change at runtime.
 */
export type RuntimeSettingKey =
  | 'title' | 'logo' | 'loginLogo' | 'loginWallpaper'
  | 'headerColor' | 'sidebarColor' | 'accentColor' | 'buttonColor'
  | 'headerTextColor' | 'sidebarTextColor' | 'accentTextColor' | 'buttonTextColor'
  | 'theme' | 'style' | 'customCSS' | 'customJavascript'
  | 'lockScreen' | 'description'
  | 'unsortedTabs' | 'expandCategoriesByDefault' | 'autoExpandNavBar'
  | 'authType' | 'plexOAuth' | 'oidcEnabled'
  | 'defaultGroupId' | 'guestGroupId'


/**
 * Minimal database interface for settings operations.
 * Accepts any Drizzle db instance with select/insert/update/delete.
 */
interface SettingsDb {
  select(fields?: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): { get(): Promise<{ name: string; value: string } | undefined> }
      all(): Promise<Array<{ name: string; value: string }>>
    }
  }
  insert(table: unknown): {
    values(data: unknown): {
      onConflictDoUpdate(config: unknown): { run(): Promise<void> }
    }
  }
  delete(table: unknown): {
    where(condition: unknown): { run(): Promise<void> }
  }
}

/**
 * Get a single setting value from the options table.
 */
export async function getSetting(
  db: SettingsDb,
  table: { name: unknown },
  key: string
): Promise<string | null> {
  const row = await db
    .select()
    .from(table)
    .where(eq(table.name as never, key))
    .get()
  return row?.value ?? null
}

/**
 * Set a single setting value in the options table (upsert).
 */
export async function setSetting(
  db: SettingsDb,
  table: { name: unknown },
  key: string,
  value: string
): Promise<void> {
  await db
    .insert(table)
    .values({ name: key, value } as never)
    .onConflictDoUpdate({
      target: table.name,
      set: { value },
    } as never)
    .run()
}

/**
 * Get a setting value parsed and validated with a Zod schema.
 * Returns defaultValue if the setting doesn't exist or fails validation.
 */
export async function getSettingTyped<T>(
  db: SettingsDb,
  table: { name: unknown },
  key: string,
  schema: z.ZodType<T>,
  defaultValue: T
): Promise<T> {
  const raw = await getSetting(db, table, key)
  if (raw === null) return defaultValue

  try {
    // Try parsing as JSON first, fall back to raw string
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = raw
    }
    const result = schema.safeParse(parsed)
    return result.success ? result.data : defaultValue
  } catch {
    return defaultValue
  }
}

/**
 * Get all settings as a key-value map.
 */
export async function getSettings(
  db: SettingsDb,
  table: { name: unknown }
): Promise<Record<string, string>> {
  const rows = await db.select().from(table).all()
  const settings: Record<string, string> = {}
  for (const row of rows) {
    settings[row.name] = row.value
  }
  return settings
}

/**
 * Delete a setting from the options table.
 */
export async function deleteSetting(
  db: SettingsDb,
  table: { name: unknown },
  key: string
): Promise<void> {
  await db
    .delete(table)
    .where(eq(table.name as never, key))
    .run()
}
