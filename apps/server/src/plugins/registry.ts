import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import { getLoadedPlugins } from './loader'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** SECURITY CRITICAL: Only allow scoped @organizrx/plugin-* packages */
export const PLUGIN_PACKAGE_PATTERN = /^@organizrx\/plugin-[a-z0-9-]+$/

/** Pattern for the short plugin name (without prefix) */
const PLUGIN_SHORT_NAME_PATTERN = /^[a-z0-9-]+$/

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

export interface RegistryCommandResult {
  success: boolean
  output: string
  exitCode: number
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let needsRestart = false

// ---------------------------------------------------------------------------
// Structured logger
// ---------------------------------------------------------------------------

function registryLog(
  level: 'info' | 'warn' | 'error',
  msg: string,
  data?: Record<string, unknown>,
): void {
  const entry = JSON.stringify({
    level,
    component: 'plugin-registry',
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
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate a short plugin name (without the @organizrx/plugin- prefix).
 * Returns the full package name if valid, throws if invalid.
 */
export function validatePluginName(shortName: string): string {
  if (!PLUGIN_SHORT_NAME_PATTERN.test(shortName)) {
    throw new Error(`Invalid plugin name: "${shortName}" — must be lowercase alphanumeric with dashes`)
  }

  const fullName = `@organizrx/plugin-${shortName}`
  if (!PLUGIN_PACKAGE_PATTERN.test(fullName)) {
    throw new Error(`Invalid plugin package name: "${fullName}"`)
  }

  return fullName
}

// ---------------------------------------------------------------------------
// npm Registry Client
// ---------------------------------------------------------------------------

/**
 * Search npm registry for available @organizrx/plugin-* packages.
 * Optionally filter results by a query string.
 */
export async function searchAvailablePlugins(query?: string): Promise<AvailablePlugin[]> {
  const searchText = query
    ? `@organizrx/plugin- ${query}`
    : '@organizrx/plugin-'

  const url = `${NPM_SEARCH_URL}?text=${encodeURIComponent(searchText)}&size=${SEARCH_SIZE}`

  const response = await fetch(url)

  if (!response.ok) {
    registryLog('error', 'npm registry search failed', {
      status: response.status,
      statusText: response.statusText,
    })
    throw new Error(`npm registry search failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as {
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

  const data = await response.json() as {
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
    const loadedEntry = loadedPlugins.find(
      (lp) => lp.plugin.manifest.id === shortName,
    )

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

// ---------------------------------------------------------------------------
// Install / Remove / Update
// ---------------------------------------------------------------------------

/**
 * Execute a bun CLI command in the server app directory.
 * Captures stdout/stderr and returns structured result.
 */
async function execBunCommand(args: string[]): Promise<RegistryCommandResult> {
  const cwd = resolve('.')

  registryLog('info', 'Executing bun command', { args, cwd })

  const proc = Bun.spawn(['bun', ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])

  const exitCode = await proc.exited
  const output = (stdout + '\n' + stderr).trim()

  if (exitCode !== 0) {
    registryLog('error', 'bun command failed', { args, exitCode, output })
  } else {
    registryLog('info', 'bun command succeeded', { args, exitCode })
  }

  return {
    success: exitCode === 0,
    output,
    exitCode,
  }
}

/**
 * Install a plugin by short name (e.g., 'plex' → `bun add @organizrx/plugin-plex`).
 * SECURITY: Name is validated against PLUGIN_PACKAGE_PATTERN before execution.
 */
export async function installPlugin(shortName: string): Promise<RegistryCommandResult> {
  const fullName = validatePluginName(shortName)
  const result = await execBunCommand(['add', fullName])

  if (result.success) {
    needsRestart = true
  }

  return result
}

/**
 * Remove a plugin by short name.
 * SECURITY: Name is validated against PLUGIN_PACKAGE_PATTERN before execution.
 */
export async function removePlugin(shortName: string): Promise<RegistryCommandResult> {
  const fullName = validatePluginName(shortName)
  const result = await execBunCommand(['remove', fullName])

  if (result.success) {
    needsRestart = true
  }

  return result
}

/**
 * Update a plugin to latest by short name.
 * SECURITY: Name is validated against PLUGIN_PACKAGE_PATTERN before execution.
 */
export async function updatePlugin(shortName: string): Promise<RegistryCommandResult> {
  const fullName = validatePluginName(shortName)
  const result = await execBunCommand(['add', `${fullName}@latest`])

  if (result.success) {
    needsRestart = true
  }

  return result
}

// ---------------------------------------------------------------------------
// Restart Flag
// ---------------------------------------------------------------------------

export function getNeedsRestart(): boolean {
  return needsRestart
}

export function clearNeedsRestart(): void {
  needsRestart = false
}

/** Reset internal state (for testing only) */
export function _resetRegistry(): void {
  needsRestart = false
}
