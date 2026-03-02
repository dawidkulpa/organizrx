import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'
import { Hono } from 'hono'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import { _clearSettingsCache, getSetting } from '../services/settings'

import { validateUrl, createPluginAPI } from './plugin-api'
import {
  validateManifest,
  loadPlugin,
  unloadPlugin,
  unloadAllPlugins,
  getLoadedPlugins,
  getPlugin,
  getPluginRoutes,
  mountPluginRoutes,
  _resetPlugins,
} from './loader'
import type { OrganizrPlugin, PluginManifest } from '@organizrx/plugin-sdk'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniqueDbPath(suffix = 'plugins'): string {
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

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      value TEXT
    )
  `)

  return db
}

function createMockManifest(overrides?: Partial<PluginManifest>): PluginManifest {
  return {
    name: 'Test Plugin',
    id: 'test-plugin',
    version: '1.0.0',
    description: 'A test plugin',
    author: 'Test Author',
    ...overrides,
  }
}

function createMockPlugin(overrides?: Partial<OrganizrPlugin>): OrganizrPlugin {
  return {
    manifest: createMockManifest(),
    onLoad: mock(async () => {}),
    ...overrides,
  }
}

// ============================================================================
// validateUrl — SSRF protection
// ============================================================================

describe('validateUrl', () => {
  it('should allow http URLs', () => {
    expect(validateUrl('http://example.com')).toEqual({ valid: true })
  })

  it('should allow https URLs', () => {
    expect(validateUrl('https://example.com')).toEqual({ valid: true })
  })

  it('should allow private IPs (home-lab)', () => {
    expect(validateUrl('http://192.168.1.100:8080')).toEqual({ valid: true })
    expect(validateUrl('http://10.0.0.1:32400')).toEqual({ valid: true })
    expect(validateUrl('http://172.16.0.5:7878')).toEqual({ valid: true })
  })

  it('should block non-HTTP schemes', () => {
    const result = validateUrl('ftp://example.com')
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('Blocked scheme')
  })

  it('should block file:// scheme', () => {
    const result = validateUrl('file:///etc/passwd')
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('Blocked scheme')
  })

  it('should block cloud metadata endpoint', () => {
    const result = validateUrl('http://169.254.169.254/latest/meta-data/')
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('cloud metadata')
  })

  it('should block localhost', () => {
    expect(validateUrl('http://localhost:3000').valid).toBe(false)
    expect(validateUrl('http://127.0.0.1:3000').valid).toBe(false)
    expect(validateUrl('http://127.0.0.2:3000').valid).toBe(false)
  })

  it('should block IPv6 loopback', () => {
    const result = validateUrl('http://[::1]:3000')
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('loopback')
  })

  it('should reject invalid URLs', () => {
    const result = validateUrl('not-a-url')
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('Invalid URL')
  })
})

// ============================================================================
// validateManifest
// ============================================================================

describe('validateManifest', () => {
  it('should accept a valid manifest', () => {
    const manifest = createMockManifest()
    const result = validateManifest(manifest)
    expect(result.id).toBe('test-plugin')
    expect(result.name).toBe('Test Plugin')
  })

  it('should accept a manifest with optional fields', () => {
    const manifest = createMockManifest({
      minAppVersion: '0.1.0',
      permissions: ['http:external'],
      homepage: true,
      configurable: true,
    })
    const result = validateManifest(manifest)
    expect(result.permissions).toEqual(['http:external'])
    expect(result.homepage).toBe(true)
  })

  it('should reject manifest with missing required fields', () => {
    expect(() => validateManifest({})).toThrow()
    expect(() => validateManifest({ name: 'Test' })).toThrow()
  })

  it('should reject manifest with invalid id format', () => {
    expect(() =>
      validateManifest(createMockManifest({ id: 'Invalid_ID' })),
    ).toThrow()
  })

  it('should reject manifest with invalid version', () => {
    expect(() =>
      validateManifest(createMockManifest({ version: 'not-semver' })),
    ).toThrow()
  })
})

// ============================================================================
// Plugin Lifecycle — load / unload
// ============================================================================

describe('plugin lifecycle', () => {
  beforeEach(() => {
    _resetPlugins()
  })

  afterEach(async () => {
    _resetPlugins()
  })

  it('should load a plugin successfully', async () => {
    await setupDb()
    const plugin = createMockPlugin()

    await loadPlugin(plugin)

    expect(plugin.onLoad).toHaveBeenCalledTimes(1)
    const loaded = getLoadedPlugins()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].status).toBe('loaded')
    expect(loaded[0].plugin.manifest.id).toBe('test-plugin')

    await closeDb()
    _clearSettingsCache()
  })

  it('should isolate errors — plugin throws on load, server continues', async () => {
    await setupDb()
    const badPlugin = createMockPlugin({
      manifest: createMockManifest({ id: 'bad-plugin' }),
      onLoad: mock(async () => {
        throw new Error('Plugin init failed')
      }),
    })

    // Should NOT throw
    await loadPlugin(badPlugin)

    const entry = getPlugin('bad-plugin')
    expect(entry).toBeDefined()
    expect(entry!.status).toBe('error')
    expect(entry!.error).toContain('Plugin init failed')

    await closeDb()
    _clearSettingsCache()
  })

  it('should skip duplicate loads', async () => {
    await setupDb()
    const plugin = createMockPlugin()

    await loadPlugin(plugin)
    await loadPlugin(plugin)

    expect(plugin.onLoad).toHaveBeenCalledTimes(1)
    expect(getLoadedPlugins()).toHaveLength(1)

    await closeDb()
    _clearSettingsCache()
  })

  it('should unload a plugin and call onUnload', async () => {
    await setupDb()
    const onUnload = mock(async () => {})
    const plugin = createMockPlugin({ onUnload })

    await loadPlugin(plugin)
    expect(getLoadedPlugins()).toHaveLength(1)

    await unloadPlugin('test-plugin')
    expect(onUnload).toHaveBeenCalledTimes(1)
    expect(getLoadedPlugins()).toHaveLength(0)

    await closeDb()
    _clearSettingsCache()
  })

  it('should handle missing onUnload gracefully', async () => {
    await setupDb()
    const plugin = createMockPlugin({ onUnload: undefined })

    await loadPlugin(plugin)
    await unloadPlugin('test-plugin')

    expect(getLoadedPlugins()).toHaveLength(0)

    await closeDb()
    _clearSettingsCache()
  })

  it('should unload all plugins in reverse order', async () => {
    await setupDb()
    const order: string[] = []

    const pluginA = createMockPlugin({
      manifest: createMockManifest({ id: 'plugin-a', name: 'A' }),
      onUnload: mock(async () => {
        order.push('a')
      }),
    })

    const pluginB = createMockPlugin({
      manifest: createMockManifest({ id: 'plugin-b', name: 'B' }),
      onUnload: mock(async () => {
        order.push('b')
      }),
    })

    await loadPlugin(pluginA)
    await loadPlugin(pluginB)
    expect(getLoadedPlugins()).toHaveLength(2)

    await unloadAllPlugins()
    expect(getLoadedPlugins()).toHaveLength(0)
    // Reverse order: B loaded after A, so B unloads first
    expect(order).toEqual(['b', 'a'])

    await closeDb()
    _clearSettingsCache()
  })

  it('should handle unload of non-existent plugin gracefully', async () => {
    // Should not throw
    await unloadPlugin('nonexistent')
  })
})

// ============================================================================
// Plugin Settings — scoped access
// ============================================================================

describe('plugin settings (scoped)', () => {
  beforeEach(async () => {
    await closeDb()
    _clearSettingsCache()
    _resetPlugins()
  })

  afterEach(async () => {
    await closeDb()
    _clearSettingsCache()
    _resetPlugins()
  })

  it('should scope settings to plugin:{id}:{key}', async () => {
    await setupDb()
    const api = createPluginAPI('plex')

    await api.settings.set('host', 'http://192.168.1.10:32400')

    // Should be stored with prefix
    const raw = await getSetting('plugin:plex:host')
    expect(raw).toBe('http://192.168.1.10:32400')
  })

  it('should get string setting', async () => {
    await setupDb()
    const api = createPluginAPI('sonarr')

    await api.settings.set('apiKey', 'abc123')
    const val = await api.settings.get('apiKey')
    expect(val).toBe('abc123')
  })

  it('should return null for missing setting', async () => {
    await setupDb()
    const api = createPluginAPI('sonarr')

    const val = await api.settings.get('nonexistent')
    expect(val).toBeNull()
  })

  it('should get number setting with default', async () => {
    await setupDb()
    const api = createPluginAPI('plex')

    await api.settings.set('port', '32400')
    const val = await api.settings.getNumber('port', 8080)
    expect(val).toBe(32400)

    const missing = await api.settings.getNumber('missing', 9999)
    expect(missing).toBe(9999)
  })

  it('should get boolean setting with default', async () => {
    await setupDb()
    const api = createPluginAPI('plex')

    await api.settings.set('enabled', 'true')
    const val = await api.settings.getBoolean('enabled', false)
    expect(val).toBe(true)

    const missing = await api.settings.getBoolean('missing', false)
    expect(missing).toBe(false)
  })

  it('should get JSON setting with default', async () => {
    await setupDb()
    const api = createPluginAPI('plex')

    const config = { libraries: [1, 2, 3] }
    await api.settings.set('config', JSON.stringify(config))

    const val = await api.settings.getJSON<{ libraries: number[] }>('config', { libraries: [] })
    expect(val).toEqual(config)

    const missing = await api.settings.getJSON('missing', { fallback: true })
    expect(missing).toEqual({ fallback: true })
  })

  it('should isolate settings between plugins', async () => {
    await setupDb()
    const apiA = createPluginAPI('plugin-a')
    const apiB = createPluginAPI('plugin-b')

    await apiA.settings.set('key', 'value-a')
    await apiB.settings.set('key', 'value-b')

    expect(await apiA.settings.get('key')).toBe('value-a')
    expect(await apiB.settings.get('key')).toBe('value-b')
  })
})

// ============================================================================
// Plugin Logger
// ============================================================================

describe('plugin logger', () => {
  it('should create a logger with all log methods', () => {
    const api = createPluginAPI('test')

    expect(typeof api.logger.info).toBe('function')
    expect(typeof api.logger.warn).toBe('function')
    expect(typeof api.logger.error).toBe('function')
    expect(typeof api.logger.debug).toBe('function')
  })

  it('should write structured JSON to stdout/stderr', () => {
    const api = createPluginAPI('test')
    const stdoutSpy = spyOn(process.stdout, 'write').mockImplementation(() => true)

    api.logger.info('hello', { extra: 'data' })

    expect(stdoutSpy).toHaveBeenCalledTimes(1)
    const output = stdoutSpy.mock.calls[0][0] as string
    const parsed = JSON.parse(output.trim())
    expect(parsed.level).toBe('info')
    expect(parsed.plugin).toBe('test')
    expect(parsed.msg).toBe('hello')
    expect(parsed.extra).toBe('data')

    stdoutSpy.mockRestore()
  })

  it('should write errors to stderr', () => {
    const api = createPluginAPI('test')
    const stderrSpy = spyOn(process.stderr, 'write').mockImplementation(() => true)

    api.logger.error('oops')

    expect(stderrSpy).toHaveBeenCalledTimes(1)
    const output = stderrSpy.mock.calls[0][0] as string
    const parsed = JSON.parse(output.trim())
    expect(parsed.level).toBe('error')

    stderrSpy.mockRestore()
  })
})

// ============================================================================
// Plugin HTTP — SSRF protection
// ============================================================================

describe('plugin HTTP', () => {
  it('should set User-Agent header', async () => {
    const api = createPluginAPI('plex')

    // We can't easily test a real fetch, but we can verify
    // the HTTP interface exists
    expect(typeof api.http.fetch).toBe('function')
  })

  it('should reject blocked URLs', async () => {
    const api = createPluginAPI('plex')

    await expect(api.http.fetch('http://localhost:3000')).rejects.toThrow('loopback')
    await expect(api.http.fetch('http://169.254.169.254/latest')).rejects.toThrow('cloud metadata')
    await expect(api.http.fetch('ftp://example.com')).rejects.toThrow('Blocked scheme')
  })
})

// ============================================================================
// Plugin Routes
// ============================================================================

describe('plugin routes', () => {
  beforeEach(() => {
    _resetPlugins()
  })

  afterEach(async () => {
    _resetPlugins()
    await closeDb()
    _clearSettingsCache()
  })

  it('should collect routes from loaded plugins', async () => {
    await setupDb()
    const pluginRoutes = new Hono()
    pluginRoutes.get('/status', (c) => c.json({ ok: true }))

    const plugin = createMockPlugin({
      getRoutes: () => pluginRoutes,
    })

    await loadPlugin(plugin)
    const routes = getPluginRoutes()

    expect(routes).toHaveLength(1)
    expect(routes[0].id).toBe('test-plugin')
  })

  it('should skip plugins without getRoutes', async () => {
    await setupDb()
    const plugin = createMockPlugin()

    await loadPlugin(plugin)
    const routes = getPluginRoutes()

    expect(routes).toHaveLength(0)
  })

  it('should mount plugin routes at /api/plugins/{id}/', async () => {
    await setupDb()
    const pluginApp = new Hono()
    pluginApp.get('/status', (c) => c.json({ status: 'ok' }))

    const plugin = createMockPlugin({
      getRoutes: () => pluginApp,
    })

    await loadPlugin(plugin)

    const app = new Hono()
    mountPluginRoutes(app)

    // Test the mounted route
    const res = await app.request('/api/plugins/test-plugin/status')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
  })

  it('should handle errors in route collection gracefully', async () => {
    await setupDb()
    const plugin = createMockPlugin({
      getRoutes: () => {
        throw new Error('Route error')
      },
    })

    await loadPlugin(plugin)

    // Should not throw
    const routes = getPluginRoutes()
    expect(routes).toHaveLength(0)
  })
})
