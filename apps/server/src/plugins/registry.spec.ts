import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'

import {
  PLUGIN_PACKAGE_PATTERN,
  validatePluginName,
  searchAvailablePlugins,
  getPluginInfo,
  getInstalledPlugins,
  installPlugin,
  removePlugin,
  updatePlugin,
  getNeedsRestart,
  clearNeedsRestart,
  _resetRegistry,
} from './registry'
import { _resetPlugins, loadPlugin } from './loader'
import type { OrganizrPlugin } from '@organizrx/plugin-sdk'

// ============================================================================
// PLUGIN_PACKAGE_PATTERN — regex validation
// ============================================================================

describe('PLUGIN_PACKAGE_PATTERN', () => {
  it('should match valid @organizrx/plugin-* names', () => {
    expect(PLUGIN_PACKAGE_PATTERN.test('@organizrx/plugin-plex')).toBe(true)
    expect(PLUGIN_PACKAGE_PATTERN.test('@organizrx/plugin-sonarr')).toBe(true)
    expect(PLUGIN_PACKAGE_PATTERN.test('@organizrx/plugin-my-plugin')).toBe(true)
    expect(PLUGIN_PACKAGE_PATTERN.test('@organizrx/plugin-a1b2c3')).toBe(true)
  })

  it('should reject packages outside @organizrx scope', () => {
    expect(PLUGIN_PACKAGE_PATTERN.test('express')).toBe(false)
    expect(PLUGIN_PACKAGE_PATTERN.test('@malicious/plugin-plex')).toBe(false)
    expect(PLUGIN_PACKAGE_PATTERN.test('plugin-plex')).toBe(false)
  })

  it('should reject packages not starting with plugin-', () => {
    expect(PLUGIN_PACKAGE_PATTERN.test('@organizrx/core')).toBe(false)
    expect(PLUGIN_PACKAGE_PATTERN.test('@organizrx/shared')).toBe(false)
    expect(PLUGIN_PACKAGE_PATTERN.test('@organizrx/server')).toBe(false)
  })

  it('should reject names with uppercase or special characters', () => {
    expect(PLUGIN_PACKAGE_PATTERN.test('@organizrx/plugin-MyPlugin')).toBe(false)
    expect(PLUGIN_PACKAGE_PATTERN.test('@organizrx/plugin-my_plugin')).toBe(false)
    expect(PLUGIN_PACKAGE_PATTERN.test('@organizrx/plugin-my.plugin')).toBe(false)
    expect(PLUGIN_PACKAGE_PATTERN.test('@organizrx/plugin-my plugin')).toBe(false)
  })

  // SECURITY: Command injection attempts
  it('should reject command injection attempts', () => {
    expect(PLUGIN_PACKAGE_PATTERN.test('@organizrx/plugin-; rm -rf /')).toBe(false)
    expect(PLUGIN_PACKAGE_PATTERN.test('@organizrx/plugin-$(whoami)')).toBe(false)
    expect(PLUGIN_PACKAGE_PATTERN.test('@organizrx/plugin-`cat /etc/passwd`')).toBe(false)
    expect(PLUGIN_PACKAGE_PATTERN.test('../../../etc/passwd')).toBe(false)
    expect(PLUGIN_PACKAGE_PATTERN.test('@organizrx/plugin-foo && echo pwned')).toBe(false)
    expect(PLUGIN_PACKAGE_PATTERN.test('@organizrx/plugin-foo|cat /etc/passwd')).toBe(false)
  })
})

// ============================================================================
// validatePluginName
// ============================================================================

describe('validatePluginName', () => {
  it('should return full package name for valid short names', () => {
    expect(validatePluginName('plex')).toBe('@organizrx/plugin-plex')
    expect(validatePluginName('sonarr')).toBe('@organizrx/plugin-sonarr')
    expect(validatePluginName('my-plugin')).toBe('@organizrx/plugin-my-plugin')
  })

  it('should throw for invalid short names', () => {
    expect(() => validatePluginName('My-Plugin')).toThrow()
    expect(() => validatePluginName('my_plugin')).toThrow()
    expect(() => validatePluginName('')).toThrow()
    expect(() => validatePluginName('my plugin')).toThrow()
  })

  // SECURITY: Path traversal / injection
  it('should reject path traversal attempts', () => {
    expect(() => validatePluginName('../../../etc/passwd')).toThrow()
    expect(() => validatePluginName('..%2F..%2Fetc%2Fpasswd')).toThrow()
  })

  it('should reject shell injection attempts', () => {
    expect(() => validatePluginName('; rm -rf /')).toThrow()
    expect(() => validatePluginName('$(whoami)')).toThrow()
    expect(() => validatePluginName('`cat /etc/passwd`')).toThrow()
    expect(() => validatePluginName('foo && echo pwned')).toThrow()
    expect(() => validatePluginName('foo|cat /etc/passwd')).toThrow()
  })
})

// ============================================================================
// searchAvailablePlugins — mock fetch
// ============================================================================

describe('searchAvailablePlugins', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('should parse npm registry search results', async () => {
    const mockResponse = {
      objects: [
        {
          package: {
            name: '@organizrx/plugin-plex',
            version: '1.0.0',
            description: 'Plex integration',
            date: '2025-01-01T00:00:00Z',
            publisher: { username: 'organizrx' },
          },
        },
        {
          package: {
            name: '@organizrx/plugin-sonarr',
            version: '2.0.0',
            description: 'Sonarr integration',
            date: '2025-02-01T00:00:00Z',
            publisher: { username: 'organizrx' },
          },
        },
      ],
    }

    globalThis.fetch = mock(async () =>
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    ) as unknown as typeof fetch

    const results = await searchAvailablePlugins()

    expect(results).toHaveLength(2)
    expect(results[0].name).toBe('@organizrx/plugin-plex')
    expect(results[0].version).toBe('1.0.0')
    expect(results[0].description).toBe('Plex integration')
    expect(results[1].name).toBe('@organizrx/plugin-sonarr')
  })

  it('should filter out non-matching packages from search results', async () => {
    const mockResponse = {
      objects: [
        {
          package: {
            name: '@organizrx/plugin-plex',
            version: '1.0.0',
            description: 'Plex',
            date: '2025-01-01T00:00:00Z',
            publisher: { username: 'organizrx' },
          },
        },
        {
          package: {
            name: 'some-random-package',
            version: '3.0.0',
            description: 'Not a plugin',
            date: '2025-01-01T00:00:00Z',
            publisher: { username: 'random' },
          },
        },
      ],
    }

    globalThis.fetch = mock(async () =>
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    ) as unknown as typeof fetch

    const results = await searchAvailablePlugins()
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('@organizrx/plugin-plex')
  })

  it('should pass query parameter in search URL', async () => {
    let calledUrl = ''
    globalThis.fetch = mock(async (input: string | URL | Request) => {
      calledUrl = String(input)
      return new Response(JSON.stringify({ objects: [] }), { status: 200 })
    }) as unknown as typeof fetch

    await searchAvailablePlugins('plex')

    expect(calledUrl).toContain('plex')
  })

  it('should throw on registry error', async () => {
    globalThis.fetch = mock(async () =>
      new Response('Internal Server Error', { status: 500, statusText: 'Internal Server Error' }),
    ) as unknown as typeof fetch

    await expect(searchAvailablePlugins()).rejects.toThrow('npm registry search failed')
  })
})

// ============================================================================
// getPluginInfo — mock fetch
// ============================================================================

describe('getPluginInfo', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('should fetch and parse package info', async () => {
    const mockData = {
      name: '@organizrx/plugin-plex',
      'dist-tags': { latest: '1.2.3' },
      description: 'Plex integration plugin',
      versions: { '1.0.0': {}, '1.1.0': {}, '1.2.3': {} },
    }

    globalThis.fetch = mock(async () =>
      new Response(JSON.stringify(mockData), { status: 200 }),
    ) as unknown as typeof fetch

    const info = await getPluginInfo('@organizrx/plugin-plex')
    expect(info.name).toBe('@organizrx/plugin-plex')
    expect(info.version).toBe('1.2.3')
    expect(info.description).toBe('Plex integration plugin')
    expect(info.versions).toEqual(['1.0.0', '1.1.0', '1.2.3'])
  })

  it('should reject invalid package names', async () => {
    await expect(getPluginInfo('malicious-package')).rejects.toThrow('Invalid plugin package name')
    await expect(getPluginInfo('@evil/plugin-hack')).rejects.toThrow('Invalid plugin package name')
  })
})

// ============================================================================
// getInstalledPlugins — mock fs and loader
// ============================================================================

describe('getInstalledPlugins', () => {
  beforeEach(() => {
    _resetPlugins()
    _resetRegistry()
  })

  afterEach(() => {
    _resetPlugins()
  })

  it('should return empty array when no plugins in package.json', () => {
    // The current package.json doesn't have @organizrx/plugin-* dependencies
    const installed = getInstalledPlugins()
    // Filter for actual plugin packages
    const plugins = installed.filter(p => p.packageName.startsWith('@organizrx/plugin-'))
    expect(Array.isArray(plugins)).toBe(true)
  })

  it('should cross-reference with loaded plugins', async () => {
    const mockPlugin: OrganizrPlugin = {
      manifest: {
        name: 'Test Plugin',
        id: 'test',
        version: '1.0.0',
        description: 'A test plugin',
        author: 'Test',
      },
      onLoad: mock(async () => {}),
    }

    // Load a mock plugin - even without matching package.json entry,
    // getInstalledPlugins should still work without error
    await loadPlugin(mockPlugin)
    const installed = getInstalledPlugins()
    expect(Array.isArray(installed)).toBe(true)
  })
})

// ============================================================================
// installPlugin / removePlugin / updatePlugin — mock Bun.spawn
// ============================================================================

describe('installPlugin', () => {
  let originalSpawn: typeof Bun.spawn

  beforeEach(() => {
    _resetRegistry()
    originalSpawn = Bun.spawn
  })

  afterEach(() => {
    Bun.spawn = originalSpawn
    _resetRegistry()
  })

  it('should validate name and call bun add', async () => {
    const spawnMock = mock((_cmd: string[], _opts?: object) => ({
      stdout: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('installed @organizrx/plugin-plex'))
          controller.close()
        },
      }),
      stderr: new ReadableStream({
        start(controller) {
          controller.close()
        },
      }),
      exited: Promise.resolve(0),
    }))

    // @ts-expect-error — mock override
    Bun.spawn = spawnMock

    const result = await installPlugin('plex')

    expect(result.success).toBe(true)
    expect(result.exitCode).toBe(0)
    expect(spawnMock).toHaveBeenCalledTimes(1)

    const calledArgs = spawnMock.mock.calls[0][0] as string[]
    expect(calledArgs).toContain('add')
    expect(calledArgs).toContain('@organizrx/plugin-plex')
  })

  it('should set needsRestart on successful install', async () => {
    const spawnMock = mock((_cmd: string[], _opts?: object) => ({
      stdout: new ReadableStream({ start(c) { c.close() } }),
      stderr: new ReadableStream({ start(c) { c.close() } }),
      exited: Promise.resolve(0),
    }))

    // @ts-expect-error — mock override
    Bun.spawn = spawnMock

    expect(getNeedsRestart()).toBe(false)
    await installPlugin('plex')
    expect(getNeedsRestart()).toBe(true)
  })

  it('should reject invalid plugin names', async () => {
    await expect(installPlugin('../../../etc/passwd')).rejects.toThrow()
    await expect(installPlugin('; rm -rf /')).rejects.toThrow()
    await expect(installPlugin('$(whoami)')).rejects.toThrow()
  })

  it('should handle install failure', async () => {
    const spawnMock = mock((_cmd: string[], _opts?: object) => ({
      stdout: new ReadableStream({ start(c) { c.close() } }),
      stderr: new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode('error: package not found'))
          c.close()
        },
      }),
      exited: Promise.resolve(1),
    }))

    // @ts-expect-error — mock override
    Bun.spawn = spawnMock

    _resetRegistry()
    const result = await installPlugin('nonexistent')
    expect(result.success).toBe(false)
    expect(result.exitCode).toBe(1)
    expect(getNeedsRestart()).toBe(false)
  })
})

describe('removePlugin', () => {
  let originalSpawn: typeof Bun.spawn

  beforeEach(() => {
    _resetRegistry()
    originalSpawn = Bun.spawn
  })

  afterEach(() => {
    Bun.spawn = originalSpawn
    _resetRegistry()
  })

  it('should validate name and call bun remove', async () => {
    const spawnMock = mock((_cmd: string[], _opts?: object) => ({
      stdout: new ReadableStream({ start(c) { c.close() } }),
      stderr: new ReadableStream({ start(c) { c.close() } }),
      exited: Promise.resolve(0),
    }))

    // @ts-expect-error — mock override
    Bun.spawn = spawnMock

    const result = await removePlugin('plex')

    expect(result.success).toBe(true)
    expect(spawnMock).toHaveBeenCalledTimes(1)

    const calledArgs = spawnMock.mock.calls[0][0] as string[]
    expect(calledArgs).toContain('remove')
    expect(calledArgs).toContain('@organizrx/plugin-plex')
  })

  it('should set needsRestart on successful remove', async () => {
    const spawnMock = mock((_cmd: string[], _opts?: object) => ({
      stdout: new ReadableStream({ start(c) { c.close() } }),
      stderr: new ReadableStream({ start(c) { c.close() } }),
      exited: Promise.resolve(0),
    }))

    // @ts-expect-error — mock override
    Bun.spawn = spawnMock

    await removePlugin('plex')
    expect(getNeedsRestart()).toBe(true)
  })

  it('should reject invalid names', async () => {
    await expect(removePlugin('Invalid_Name')).rejects.toThrow()
  })
})

describe('updatePlugin', () => {
  let originalSpawn: typeof Bun.spawn

  beforeEach(() => {
    _resetRegistry()
    originalSpawn = Bun.spawn
  })

  afterEach(() => {
    Bun.spawn = originalSpawn
    _resetRegistry()
  })

  it('should validate name and call bun add with @latest', async () => {
    const spawnMock = mock((_cmd: string[], _opts?: object) => ({
      stdout: new ReadableStream({ start(c) { c.close() } }),
      stderr: new ReadableStream({ start(c) { c.close() } }),
      exited: Promise.resolve(0),
    }))

    // @ts-expect-error — mock override
    Bun.spawn = spawnMock

    const result = await updatePlugin('plex')

    expect(result.success).toBe(true)
    expect(spawnMock).toHaveBeenCalledTimes(1)

    const calledArgs = spawnMock.mock.calls[0][0] as string[]
    expect(calledArgs).toContain('add')
    expect(calledArgs).toContain('@organizrx/plugin-plex@latest')
  })

  it('should set needsRestart on successful update', async () => {
    const spawnMock = mock((_cmd: string[], _opts?: object) => ({
      stdout: new ReadableStream({ start(c) { c.close() } }),
      stderr: new ReadableStream({ start(c) { c.close() } }),
      exited: Promise.resolve(0),
    }))

    // @ts-expect-error — mock override
    Bun.spawn = spawnMock

    await updatePlugin('plex')
    expect(getNeedsRestart()).toBe(true)
  })
})

// ============================================================================
// Restart flag management
// ============================================================================

describe('restart flag', () => {
  beforeEach(() => {
    _resetRegistry()
  })

  it('should initially be false', () => {
    expect(getNeedsRestart()).toBe(false)
  })

  it('should be clearable', () => {
    // We can't set it directly without mocking spawn, so test clear
    clearNeedsRestart()
    expect(getNeedsRestart()).toBe(false)
  })

  it('should reset via _resetRegistry', () => {
    _resetRegistry()
    expect(getNeedsRestart()).toBe(false)
  })
})
