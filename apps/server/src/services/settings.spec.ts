import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import {
  getAllSettings,
  getSetting,
  getSettingString,
  getSettingNumber,
  getSettingBoolean,
  getSettingJSON,
  setSetting,
  setSettings,
  deleteSetting,
  seedDefaultSettings,
  _clearSettingsCache,
} from './settings'

function uniqueDbPath(suffix = 'settings'): string {
  const dir = join(tmpdir(), 'organizrx-test-' + process.pid)
  mkdirSync(dir, { recursive: true })
  return join(dir, `test-${suffix}-${Date.now()}.db`)
}

async function setupDb() {
  _resetConfig()
  await initConfig()
  const dbPath = uniqueDbPath()
  await initDb({ dialect: 'sqlite', url: dbPath })

  const db = getRawDb() as SqliteDb

  // Create options table manually via raw SQLite
  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      value TEXT
    )
  `)

  return db
}

describe('settings service', () => {
  beforeEach(async () => {
    await closeDb()
    _clearSettingsCache()
  })

  afterEach(async () => {
    await closeDb()
    _clearSettingsCache()
  })

  // -------------------------------------------------------------------------
  // Get/Set single setting
  // -------------------------------------------------------------------------

  describe('get/set single', () => {
    it('should set and get a single setting', async () => {
      await setupDb()
      await setSetting('testKey', 'testValue')

      const val = await getSetting('testKey')
      expect(val).toBe('testValue')
    })

    it('should return null for non-existent setting', async () => {
      await setupDb()
      const val = await getSetting('nonexistent')
      expect(val).toBe(null)
    })

    it('should overwrite existing setting', async () => {
      await setupDb()
      await setSetting('key1', 'value1')
      await setSetting('key1', 'value2')

      const val = await getSetting('key1')
      expect(val).toBe('value2')
    })
  })

  // -------------------------------------------------------------------------
  // Bulk get/set
  // -------------------------------------------------------------------------

  describe('bulk operations', () => {
    it('should get all settings as object', async () => {
      await setupDb()
      await setSetting('a', '1')
      await setSetting('b', '2')
      await setSetting('c', '3')

      const all = await getAllSettings()
      expect(all).toEqual({ a: '1', b: '2', c: '3' })
    })

    it('should set multiple settings at once', async () => {
      await setupDb()
      await setSettings({ x: 'X', y: 'Y', z: 'Z' })

      const all = await getAllSettings()
      expect(all).toEqual({ x: 'X', y: 'Y', z: 'Z' })
    })
  })

  // -------------------------------------------------------------------------
  // Typed getters
  // -------------------------------------------------------------------------

  describe('typed getters', () => {
    it('should get string with default', async () => {
      await setupDb()
      await setSetting('str', 'hello')

      const val = await getSettingString('str', 'default')
      expect(val).toBe('hello')

      const missing = await getSettingString('missing', 'fallback')
      expect(missing).toBe('fallback')
    })

    it('should get number with default', async () => {
      await setupDb()
      await setSetting('num', '42')

      const val = await getSettingNumber('num', 0)
      expect(val).toBe(42)

      const missing = await getSettingNumber('missing', 99)
      expect(missing).toBe(99)

      await setSetting('invalid', 'notanumber')
      const invalid = await getSettingNumber('invalid', 10)
      expect(invalid).toBe(10)
    })

    it('should get boolean with default', async () => {
      await setupDb()
      await setSetting('bool1', '1')
      await setSetting('bool2', 'true')
      await setSetting('bool3', 'yes')
      await setSetting('bool4', 'false')

      expect(await getSettingBoolean('bool1', false)).toBe(true)
      expect(await getSettingBoolean('bool2', false)).toBe(true)
      expect(await getSettingBoolean('bool3', false)).toBe(true)
      expect(await getSettingBoolean('bool4', true)).toBe(false)

      const missing = await getSettingBoolean('missing', true)
      expect(missing).toBe(true)
    })

    it('should get JSON with default', async () => {
      await setupDb()
      const obj = { foo: 'bar', num: 123 }
      await setSetting('json', JSON.stringify(obj))

      const val = await getSettingJSON<{ foo: string; num: number }>('json', { foo: '', num: 0 })
      expect(val).toEqual(obj)

      const missing = await getSettingJSON('missing', { default: true })
      expect(missing).toEqual({ default: true })

      await setSetting('invalid-json', '{invalid')
      const invalid = await getSettingJSON('invalid-json', { fallback: 'ok' })
      expect(invalid).toEqual({ fallback: 'ok' })
    })
  })

  // -------------------------------------------------------------------------
  // Cache behavior
  // -------------------------------------------------------------------------

  describe('caching', () => {
    it('should cache settings after first read', async () => {
      const db = await setupDb()
      await setSetting('cached', 'initial')

      // First read populates cache
      const first = await getAllSettings()
      expect(first.cached).toBe('initial')

      // Manually change DB behind the scenes (bypass service)
      db.$client.exec(`UPDATE options SET value = 'modified' WHERE name = 'cached'`)

      // Second read should return cached value (not 'modified')
      const second = await getAllSettings()
      expect(second.cached).toBe('initial')
    })

    it('should invalidate cache on write', async () => {
      await setupDb()
      await setSetting('key', 'v1')

      const first = await getAllSettings()
      expect(first.key).toBe('v1')

      // Update via service (invalidates cache)
      await setSetting('key', 'v2')

      const second = await getAllSettings()
      expect(second.key).toBe('v2')
    })

    it('should invalidate cache on delete', async () => {
      await setupDb()
      await setSetting('toDelete', 'value')

      const before = await getAllSettings()
      expect(before.toDelete).toBe('value')

      await deleteSetting('toDelete')

      const after = await getAllSettings()
      expect(after.toDelete).toBeUndefined()
    })
  })

  // -------------------------------------------------------------------------
  // Delete setting
  // -------------------------------------------------------------------------

  describe('delete', () => {
    it('should delete a setting', async () => {
      await setupDb()
      await setSetting('temp', 'data')

      let val = await getSetting('temp')
      expect(val).toBe('data')

      await deleteSetting('temp')

      val = await getSetting('temp')
      expect(val).toBe(null)
    })
  })

  // -------------------------------------------------------------------------
  // Seed defaults
  // -------------------------------------------------------------------------

  describe('seed defaults', () => {
    it('should seed default settings on first run', async () => {
      await setupDb()
      await seedDefaultSettings()

      const all = await getAllSettings()
      expect(all.title).toBe('OrganizrX')
      expect(all.theme).toBe('dark')
      expect(all.loginWallpaper).toBe('')
      expect(all.unsortedTabs).toBe('bottom')
      expect(all.headerColor).toBe('#2d2d2d')
      expect(all.headerTextColor).toBe('#ffffff')
      expect(all.sidebarColor).toBe('#1a1a1a')
      expect(all.sidebarTextColor).toBe('#ffffff')
      expect(all.accentColor).toBe('#4caf50')
    })

    it('should not overwrite existing settings when seeding', async () => {
      await setupDb()
      await setSetting('title', 'CustomTitle')

      await seedDefaultSettings()

      const title = await getSetting('title')
      expect(title).toBe('CustomTitle')
    })
  })
})
