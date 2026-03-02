import { z } from 'zod'
import { readdirSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { Hono } from 'hono'
import type { OrganizrPlugin, PluginManifest } from '@organizrx/plugin-sdk'
import { createPluginAPI } from './plugin-api'

// ---------------------------------------------------------------------------
// Manifest validation schema (Zod)
// ---------------------------------------------------------------------------

const pluginManifestSchema = z.object({
  name: z.string().min(1),
  id: z.string().regex(/^[a-z0-9-]+$/, 'Plugin id must be lowercase alphanumeric with dashes'),
  version: z.string().regex(/^\d+\.\d+\.\d+/, 'Version must follow semver'),
  description: z.string().min(1),
  author: z.string().min(1),
  minAppVersion: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  homepage: z.boolean().optional(),
  configurable: z.boolean().optional(),
})

export function validateManifest(manifest: unknown): PluginManifest {
  return pluginManifestSchema.parse(manifest)
}

// ---------------------------------------------------------------------------
// Plugin package name validation
// ---------------------------------------------------------------------------

const PLUGIN_PACKAGE_PATTERN = /^@organizrx\/plugin-[a-z0-9-]+$/

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PluginStatus = 'loaded' | 'error' | 'unloaded'

export interface LoadedPlugin {
  plugin: OrganizrPlugin
  status: PluginStatus
  error?: string
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const loadedPlugins = new Map<string, LoadedPlugin>()

// Structured logger for the plugin system itself
function systemLog(
  level: 'info' | 'warn' | 'error',
  msg: string,
  data?: Record<string, unknown>,
): void {
  const entry = JSON.stringify({
    level,
    component: 'plugin-loader',
    msg,
    time: new Date().toISOString(),
    ...data,
  })
  if (level === 'error' || level === 'warn') {
    process.stderr.write(entry + '\n')
  } else {
    process.stdout.write(entry + '\n')
  }
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

/**
 * Scan `node_modules/@organizrx/plugin-*` directories and return plugin
 * modules that export a valid OrganizrPlugin.
 */
export async function discoverPlugins(): Promise<OrganizrPlugin[]> {
  const plugins: OrganizrPlugin[] = []
  const scopeDir = resolve('node_modules', '@organizrx')

  if (!existsSync(scopeDir)) {
    systemLog('info', 'No @organizrx scope found in node_modules — 0 plugins discovered')
    return plugins
  }

  let entries: string[]
  try {
    entries = readdirSync(scopeDir)
  } catch {
    systemLog('warn', 'Failed to read @organizrx scope directory')
    return plugins
  }

  for (const entry of entries) {
    if (!entry.startsWith('plugin-')) continue

    const packageName = `@organizrx/${entry}`
    if (!PLUGIN_PACKAGE_PATTERN.test(packageName)) {
      systemLog('warn', 'Skipping package with invalid name', { packageName })
      continue
    }

    try {
      const packageDir = join(scopeDir, entry)
      const pkgJsonPath = join(packageDir, 'package.json')

      if (!existsSync(pkgJsonPath)) {
        systemLog('warn', 'Plugin package missing package.json', { packageName })
        continue
      }

      // Import the plugin module
      const pluginModule = await import(packageName) as { default?: OrganizrPlugin } & Record<string, unknown>
      const plugin = (pluginModule.default ?? pluginModule) as OrganizrPlugin

      if (!plugin.manifest || typeof plugin.onLoad !== 'function') {
        systemLog('warn', 'Plugin module does not implement OrganizrPlugin interface', {
          packageName,
        })
        continue
      }

      // Validate manifest
      validateManifest(plugin.manifest)

      plugins.push(plugin)
      systemLog('info', 'Discovered plugin', {
        pluginId: plugin.manifest.id,
        version: plugin.manifest.version,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      systemLog('error', 'Failed to discover plugin', { packageName, error: message })
    }
  }

  return plugins
}

// ---------------------------------------------------------------------------
// Load / Unload
// ---------------------------------------------------------------------------

/**
 * Load a single plugin: create its scoped API, call onLoad().
 * On error, records the error and marks the plugin as 'error' — does NOT throw.
 */
export async function loadPlugin(plugin: OrganizrPlugin): Promise<void> {
  const { id } = plugin.manifest

  if (loadedPlugins.has(id)) {
    systemLog('warn', 'Plugin already loaded — skipping', { pluginId: id })
    return
  }

  try {
    const api = createPluginAPI(id)
    await plugin.onLoad(api)
    loadedPlugins.set(id, { plugin, status: 'loaded' })
    systemLog('info', 'Plugin loaded successfully', { pluginId: id })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    loadedPlugins.set(id, { plugin, status: 'error', error: message })
    systemLog('error', 'Plugin failed to load', { pluginId: id, error: message })
  }
}

/**
 * Discover → validate → load all plugins in sequence.
 * Errors in individual plugins are isolated.
 */
export async function loadAllPlugins(): Promise<void> {
  systemLog('info', 'Starting plugin discovery and loading')
  const plugins = await discoverPlugins()

  for (const plugin of plugins) {
    await loadPlugin(plugin)
  }

  const loaded = [...loadedPlugins.values()].filter((p) => p.status === 'loaded').length
  const errored = [...loadedPlugins.values()].filter((p) => p.status === 'error').length
  systemLog('info', 'Plugin loading complete', { loaded, errored, total: plugins.length })
}

/**
 * Unload a single plugin by id. Calls onUnload() if defined.
 */
export async function unloadPlugin(pluginId: string): Promise<void> {
  const entry = loadedPlugins.get(pluginId)
  if (!entry) {
    systemLog('warn', 'Cannot unload — plugin not found', { pluginId })
    return
  }

  try {
    if (typeof entry.plugin.onUnload === 'function') {
      await entry.plugin.onUnload()
    }
    entry.status = 'unloaded'
    loadedPlugins.delete(pluginId)
    systemLog('info', 'Plugin unloaded', { pluginId })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    systemLog('error', 'Plugin failed to unload cleanly', { pluginId, error: message })
    loadedPlugins.delete(pluginId)
  }
}

/**
 * Unload all plugins in reverse load order.
 */
export async function unloadAllPlugins(): Promise<void> {
  const ids = [...loadedPlugins.keys()].reverse()
  for (const id of ids) {
    await unloadPlugin(id)
  }
  systemLog('info', 'All plugins unloaded')
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function getLoadedPlugins(): LoadedPlugin[] {
  return [...loadedPlugins.values()]
}

export function getPlugin(pluginId: string): LoadedPlugin | undefined {
  return loadedPlugins.get(pluginId)
}

// ---------------------------------------------------------------------------
// Route mounting
// ---------------------------------------------------------------------------

/**
 * Collect routes from all loaded plugins.
 * Returns an array of { id, routes } where routes is the Hono app.
 */
export function getPluginRoutes(): Array<{ id: string; routes: unknown }> {
  const result: Array<{ id: string; routes: unknown }> = []

  for (const [id, entry] of loadedPlugins) {
    if (entry.status !== 'loaded') continue
    if (typeof entry.plugin.getRoutes !== 'function') continue

    try {
      const routes = entry.plugin.getRoutes()
      if (routes) {
        result.push({ id, routes })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      systemLog('error', 'Failed to get routes from plugin', { pluginId: id, error: message })
    }
  }

  return result
}

/**
 * Mount each plugin's routes at `/api/plugins/{plugin.manifest.id}/`.
 * Routes are type-cast to Hono app instances.
 */
export function mountPluginRoutes(app: Hono): void {
  const pluginRoutes = getPluginRoutes()

  for (const { id, routes } of pluginRoutes) {
    const mountPath = `/api/plugins/${id}`
    try {
      app.route(mountPath, routes as Hono)
      systemLog('info', 'Mounted plugin routes', { pluginId: id, path: mountPath })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      systemLog('error', 'Failed to mount plugin routes', {
        pluginId: id,
        path: mountPath,
        error: message,
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Clear all loaded plugins (for testing only) */
export function _resetPlugins(): void {
  loadedPlugins.clear()
}
