// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** SECURITY CRITICAL: Only allow scoped @organizrx/plugin-* packages */
export const PLUGIN_PACKAGE_PATTERN = /^@organizrx\/plugin-[a-z0-9-]+$/

/** Pattern for the short plugin name (without prefix) */
const PLUGIN_SHORT_NAME_PATTERN = /^[a-z0-9-]+$/

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate a short plugin name (without the @organizrx/plugin- prefix).
 * Returns the full package name if valid, throws if invalid.
 */
export function validatePluginName(shortName: string): string {
  if (!PLUGIN_SHORT_NAME_PATTERN.test(shortName)) {
    throw new Error(
      `Invalid plugin name: "${shortName}" — must be lowercase alphanumeric with dashes`
    )
  }

  const fullName = `@organizrx/plugin-${shortName}`
  if (!PLUGIN_PACKAGE_PATTERN.test(fullName)) {
    throw new Error(`Invalid plugin package name: "${fullName}"`)
  }

  return fullName
}
