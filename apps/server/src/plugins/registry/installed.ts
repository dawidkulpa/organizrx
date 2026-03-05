import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'

import { getLoadedPlugins } from '../loader'
import { PLUGIN_PACKAGE_PATTERN } from './validation'
import { registryLog } from './logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InstalledPlugin {
  packageName: string
  shortName: string
  installedVersion: string
  status: 'loaded' | 'error' | 'not-loaded'
  error?: string
  manifest?: {
    name: string
    id: string
    version: string
    description: string
    author: string
    configurable?: boolean
  }
}

// ---------------------------------------------------------------------------
// Installed Plugin Queries
// ---------------------------------------------------------------------------

/**
 * Read apps/server/package.json and return installed @organizrx/plugin-* packages.
 * Cross-references with loaded plugin state from the loader.
 */
export function getInstalledPlugins(): InstalledPlugin[] {
  const packageJsonPath = resolve('package.json')

  let packageJson: { dependencies?: Record<string, string> }
  try {
    const content = readFileSync(packageJsonPath, 'utf-8')
    packageJson = JSON.parse(content) as { dependencies?: Record<string, string> }
  } catch {
    registryLog('warn', 'Failed to read package.json for installed plugins')
    return []
  }

  const deps = packageJson.dependencies ?? {}
  const loadedPlugins = getLoadedPlugins()
  const results: InstalledPlugin[] = []

  for (const [name, version] of Object.entries(deps)) {
    if (!PLUGIN_PACKAGE_PATTERN.test(name)) continue

    const shortName = name.replace('@organizrx/plugin-', '')
    const loadedEntry = loadedPlugins.find((lp) => lp.plugin.manifest.id === shortName)

    const installed: InstalledPlugin = {
      packageName: name,
      shortName,
      installedVersion: version.replace(/^[\^~]/, ''),
      status: 'not-loaded',
    }

    if (loadedEntry) {
      installed.status = loadedEntry.status === 'loaded' ? 'loaded' : 'error'
      installed.error = loadedEntry.error
      installed.manifest = {
        name: loadedEntry.plugin.manifest.name,
        id: loadedEntry.plugin.manifest.id,
        version: loadedEntry.plugin.manifest.version,
        description: loadedEntry.plugin.manifest.description,
        author: loadedEntry.plugin.manifest.author,
        configurable: loadedEntry.plugin.manifest.configurable,
      }
    }

    results.push(installed)
  }

  return results
}
