import { resolve } from 'node:path'

import { validatePluginName } from './validation'
import { registryLog } from './logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
// Bun command execution
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

// ---------------------------------------------------------------------------
// Install / Remove / Update
// ---------------------------------------------------------------------------

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
