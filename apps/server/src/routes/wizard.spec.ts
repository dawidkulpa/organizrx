import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Hono } from 'hono'

import { initConfig, _resetConfig } from '../config'
import { closeDb, getRawDb, initDb } from '../db'
import type { SqliteDb } from '../db'
import { _clearSettingsCache, getSetting } from '../services/settings'
import wizard from './wizard'

function runSql(db: SqliteDb, sql: string) {
  db.$client.prepare(sql).run()
}

function uniqueDbPath(suffix = 'wizard-routes'): string {
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

  runSql(
    db,
    `
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
  `
  )

  runSql(
    db,
    `
    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      value TEXT
    )
  `
  )

  runSql(
    db,
    `
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
  `
  )
}

function createApp() {
  const app = new Hono()
  app.route('/api/wizard', wizard)
  return app
}

describe('wizard routes', () => {
  beforeEach(async () => {
    await closeDb()
    _clearSettingsCache()
  })

  afterEach(async () => {
    await closeDb()
    _clearSettingsCache()
  })

  it('stores baseUrl during wizard completion', async () => {
    await setupDb()
    const app = createApp()

    const res = await app.request('/api/wizard/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'adminuser',
        password: 'password123',
        siteTitle: 'OrganizrX',
        baseUrl: 'https://dash.example.com',
      }),
    })

    expect(res.status).toBe(200)
    expect(await getSetting('wizardCompleted')).toBe('true')
    expect(await getSetting('siteTitle')).toBe('OrganizrX')
    expect(await getSetting('baseUrl')).toBe('https://dash.example.com')
  })

  it('accepts an empty baseUrl', async () => {
    await setupDb()
    const app = createApp()

    const res = await app.request('/api/wizard/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'adminuser',
        password: 'password123',
        siteTitle: 'OrganizrX',
        baseUrl: '',
      }),
    })

    expect(res.status).toBe(200)
    expect(await getSetting('baseUrl')).toBe('')
  })

  it('rejects an invalid baseUrl', async () => {
    await setupDb()
    const app = createApp()

    const res = await app.request('/api/wizard/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'adminuser',
        password: 'password123',
        siteTitle: 'OrganizrX',
        baseUrl: 'not-a-url',
      }),
    })

    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })
})
