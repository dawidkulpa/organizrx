import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Hono } from 'hono'

import { initConfig, _resetConfig } from '../config'
import { closeDb, getRawDb, initDb } from '../db'
import type { SqliteDb } from '../db'
import { createAccessToken, toAuthUser } from '../services/auth'
import { _clearSettingsCache, getSetting } from '../services/settings'
import settings from './settings'

function runSql(db: SqliteDb, sql: string) {
  db.$client.prepare(sql).run()
}

function uniqueDbPath(suffix = 'settings-routes'): string {
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
    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      value TEXT
    )
  `
  )
}

function createApp() {
  const app = new Hono()
  app.route('/api/settings', settings)
  return app
}

async function createAdminJwt() {
  const authUser = toAuthUser({
    id: 1,
    username: 'admin',
    email: 'admin@test.com',
    groupName: 'Admin',
    group_id: 0,
    image: null,
  })

  return createAccessToken(authUser)
}

describe('settings routes', () => {
  beforeEach(async () => {
    await closeDb()
    _clearSettingsCache()
  })

  afterEach(async () => {
    await closeDb()
    _clearSettingsCache()
  })

  it('upserts a missing appearance setting through PUT /api/settings/:key', async () => {
    await setupDb()
    const jwt = await createAdminJwt()
    const app = createApp()

    const res = await app.request('/api/settings/theme', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value: 'light' }),
    })

    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.key).toBe('theme')
    expect(json.data.value).toBe('light')
    expect(await getSetting('theme')).toBe('light')
  })
})
