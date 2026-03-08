import { eq } from 'drizzle-orm'

import { getRawDb, getDialect, type SqliteDb, type MysqlDb, type PostgresDb } from '../db'
import * as sqliteSchema from '../db/schema/sqlite'
import * as mysqlSchema from '../db/schema/mysql'
import * as pgSchema from '../db/schema/pg'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DialectResult =
  | { db: SqliteDb; options: typeof sqliteSchema.options; dialect: 'sqlite' }
  | { db: MysqlDb; options: typeof mysqlSchema.options; dialect: 'mysql' }
  | { db: PostgresDb; options: typeof pgSchema.options; dialect: 'postgresql' }

function dialectCtx(): DialectResult {
  const dialect = getDialect()
  const raw = getRawDb()
  switch (dialect) {
    case 'sqlite':
      return { db: raw as SqliteDb, options: sqliteSchema.options, dialect }
    case 'mysql':
      return { db: raw as MysqlDb, options: mysqlSchema.options, dialect }
    case 'postgresql':
      return { db: raw as PostgresDb, options: pgSchema.options, dialect }
    default:
      throw new Error(`Unsupported dialect: ${dialect}`)
  }
}

// ---------------------------------------------------------------------------
// In-memory cache with TTL
// ---------------------------------------------------------------------------

interface CacheEntry {
  data: Record<string, string>
  timestamp: number
}

let cache: CacheEntry | null = null
const CACHE_TTL_MS = 60_000 // 60 seconds

function isCacheValid(): boolean {
  if (!cache) return false
  return Date.now() - cache.timestamp < CACHE_TTL_MS
}

function setCache(data: Record<string, string>): void {
  cache = { data, timestamp: Date.now() }
}

export function _clearSettingsCache(): void {
  cache = null
}

// ---------------------------------------------------------------------------
// Core getters
// ---------------------------------------------------------------------------

export async function getAllSettings(): Promise<Record<string, string>> {
  if (isCacheValid() && cache) {
    return cache.data
  }

  const ctx = dialectCtx()
  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db.select().from(ctx.options).all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db.select().from(ctx.options)
  } else {
    rows = await ctx.db.select().from(ctx.options)
  }

  const result: Record<string, string> = {}
  for (const row of rows as Array<{ name: string | null; value: string | null }>) {
    if (row.name) {
      result[row.name] = row.value ?? ''
    }
  }

  setCache(result)
  return result
}

export async function getSetting(key: string): Promise<string | null> {
  const all = await getAllSettings()
  return all[key] ?? null
}

// ---------------------------------------------------------------------------
// Typed getters
// ---------------------------------------------------------------------------

export async function getSettingString(key: string, defaultValue: string): Promise<string> {
  const val = await getSetting(key)
  return val ?? defaultValue
}

export async function getSettingNumber(key: string, defaultValue: number): Promise<number> {
  const val = await getSetting(key)
  if (!val) return defaultValue
  const parsed = Number(val)
  return Number.isNaN(parsed) ? defaultValue : parsed
}

export async function getSettingBoolean(key: string, defaultValue: boolean): Promise<boolean> {
  const val = await getSetting(key)
  if (!val) return defaultValue
  const lower = val.toLowerCase()
  return lower === '1' || lower === 'true' || lower === 'yes'
}

export async function getSettingJSON<T>(key: string, defaultValue: T): Promise<T> {
  const val = await getSetting(key)
  if (!val) return defaultValue
  try {
    return JSON.parse(val) as T
  } catch {
    return defaultValue
  }
}

// ---------------------------------------------------------------------------
// Setters (upsert)
// ---------------------------------------------------------------------------

export async function setSetting(key: string, value: string): Promise<void> {
  const ctx = dialectCtx()

  if (ctx.dialect === 'sqlite') {
    // SQLite: use INSERT OR REPLACE
    ctx.db
      .insert(ctx.options)
      .values({ name: key, value })
      .onConflictDoUpdate({
        target: ctx.options.name,
        set: { value },
      })
      .run()
  } else if (ctx.dialect === 'mysql') {
    // MySQL: use ON DUPLICATE KEY UPDATE
    await ctx.db.insert(ctx.options).values({ name: key, value }).onDuplicateKeyUpdate({
      set: { value },
    })
  } else {
    // PostgreSQL: use ON CONFLICT DO UPDATE
    await ctx.db.insert(ctx.options).values({ name: key, value }).onConflictDoUpdate({
      target: ctx.options.name,
      set: { value },
    })
  }

  _clearSettingsCache()
}

export async function setSettings(settings: Record<string, string>): Promise<void> {
  const entries = Object.entries(settings)
  for (const [key, value] of entries) {
    await setSetting(key, value)
  }
  // Cache already invalidated by setSetting
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteSetting(key: string): Promise<void> {
  const ctx = dialectCtx()

  if (ctx.dialect === 'sqlite') {
    ctx.db.delete(ctx.options).where(eq(ctx.options.name, key)).run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db.delete(ctx.options).where(eq(ctx.options.name, key))
  } else {
    await ctx.db.delete(ctx.options).where(eq(ctx.options.name, key))
  }

  _clearSettingsCache()
}

export async function migrateSettingsKeys(): Promise<number> {
  const ctx = dialectCtx()
  const keyMap: Record<string, string> = {
    SITE_TITLE: 'siteTitle',
    WIZARD_COMPLETED: 'wizardCompleted',
    title: 'siteTitle',
    BASE_URL: 'baseUrl',
  }

  let migratedCount = 0

  for (const [oldKey, newKey] of Object.entries(keyMap)) {
    const oldValue = await getSetting(oldKey)
    if (oldValue === null) continue

    const newValue = await getSetting(newKey)

    if (newValue === null) {
      if (ctx.dialect === 'sqlite') {
        ctx.db.update(ctx.options).set({ name: newKey }).where(eq(ctx.options.name, oldKey)).run()
      } else if (ctx.dialect === 'mysql') {
        await ctx.db.update(ctx.options).set({ name: newKey }).where(eq(ctx.options.name, oldKey))
      } else {
        await ctx.db.update(ctx.options).set({ name: newKey }).where(eq(ctx.options.name, oldKey))
      }
    } else {
      if (ctx.dialect === 'sqlite') {
        ctx.db.delete(ctx.options).where(eq(ctx.options.name, oldKey)).run()
      } else if (ctx.dialect === 'mysql') {
        await ctx.db.delete(ctx.options).where(eq(ctx.options.name, oldKey))
      } else {
        await ctx.db.delete(ctx.options).where(eq(ctx.options.name, oldKey))
      }
    }

    migratedCount += 1
    _clearSettingsCache()
  }

  return migratedCount
}

// ---------------------------------------------------------------------------
// Seed defaults
// ---------------------------------------------------------------------------

export async function seedDefaultSettings(): Promise<void> {
  const defaults: Record<string, string> = {
    siteTitle: 'OrganizrX',
    baseUrl: '',
    defaultPage: 'dashboard',
    registrationEnabled: 'false',
    timezone: 'UTC',
    theme: 'dark',
    loginWallpaper: '',
    unsortedTabs: 'bottom',
    headerColor: '#2d2d2d',
    headerTextColor: '#ffffff',
    sidebarColor: '#1a1a1a',
    sidebarTextColor: '#ffffff',
    accentColor: '#4caf50',
  }

  const existing = await getAllSettings()

  for (const [key, value] of Object.entries(defaults)) {
    if (!(key in existing)) {
      await setSetting(key, value)
    }
  }
}
