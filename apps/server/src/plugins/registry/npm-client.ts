import { PLUGIN_PACKAGE_PATTERN } from './validation'
import { registryLog } from './logger'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NPM_REGISTRY_BASE = 'https://registry.npmjs.org'
const NPM_SEARCH_URL = `${NPM_REGISTRY_BASE}/-/v1/search`
const SEARCH_SIZE = 50

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AvailablePlugin {
  name: string
  version: string
  description: string
  date: string
  publisher: string
}

// ---------------------------------------------------------------------------
// npm Registry Client
// ---------------------------------------------------------------------------

/**
 * Search npm registry for available @organizrx/plugin-* packages.
 * Optionally filter results by a query string.
 */
export async function searchAvailablePlugins(query?: string): Promise<AvailablePlugin[]> {
  const searchText = query ? `@organizrx/plugin- ${query}` : '@organizrx/plugin-'

  const url = `${NPM_SEARCH_URL}?text=${encodeURIComponent(searchText)}&size=${SEARCH_SIZE}`

  const response = await fetch(url)

  if (!response.ok) {
    registryLog('error', 'npm registry search failed', {
      status: response.status,
      statusText: response.statusText,
    })
    throw new Error(`npm registry search failed: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as {
    objects: Array<{
      package: {
        name: string
        version: string
        description?: string
        date: string
        publisher?: { username: string }
      }
    }>
  }

  const results: AvailablePlugin[] = []

  for (const obj of data.objects) {
    const pkg = obj.package

    // Only include packages matching our pattern
    if (!PLUGIN_PACKAGE_PATTERN.test(pkg.name)) continue

    results.push({
      name: pkg.name,
      version: pkg.version,
      description: pkg.description ?? '',
      date: pkg.date,
      publisher: pkg.publisher?.username ?? 'unknown',
    })
  }

  return results
}

/**
 * Fetch specific package info from npm registry.
 */
export async function getPluginInfo(packageName: string): Promise<{
  name: string
  version: string
  description: string
  versions: string[]
}> {
  if (!PLUGIN_PACKAGE_PATTERN.test(packageName)) {
    throw new Error(`Invalid plugin package name: "${packageName}"`)
  }

  const url = `${NPM_REGISTRY_BASE}/${encodeURIComponent(packageName)}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch plugin info: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as {
    name: string
    'dist-tags': { latest: string }
    description?: string
    versions: Record<string, unknown>
  }

  return {
    name: data.name,
    version: data['dist-tags'].latest,
    description: data.description ?? '',
    versions: Object.keys(data.versions),
  }
}
