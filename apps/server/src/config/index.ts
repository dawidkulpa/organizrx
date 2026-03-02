import { validateEnv, type Env } from './env'
import { loadConfig, type AppConfig } from './config'

export { validateEnv, envSchema, type Env, type DatabaseDialect } from './env'
export { loadConfig, configSchema, type AppConfig } from './config'
export {
  getSetting,
  setSetting,
  getSettingTyped,
  getSettings,
  deleteSetting,
  type RuntimeSettingKey,
} from './settings'

let cachedEnv: Env | null = null
let cachedConfig: AppConfig | null = null

/**
 * Initialize the configuration system.
 * Validates environment variables and loads the config file.
 * Call once at server startup before any other code runs.
 */
export async function initConfig(): Promise<{ env: Env; config: AppConfig }> {
  cachedEnv = validateEnv()
  cachedConfig = await loadConfig(cachedEnv.LOG_LEVEL)
  return { env: cachedEnv, config: cachedConfig }
}

/**
 * Get the validated environment variables.
 * Throws if initConfig() hasn't been called.
 */
export function getEnv(): Env {
  if (!cachedEnv) {
    throw new Error('Config not initialized. Call initConfig() at startup.')
  }
  return cachedEnv
}

/**
 * Get the loaded application config.
 * Throws if initConfig() hasn't been called.
 */
export function getConfig(): AppConfig {
  if (!cachedConfig) {
    throw new Error('Config not initialized. Call initConfig() at startup.')
  }
  return cachedConfig
}

/**
 * Reset cached config (for testing only).
 */
export function _resetConfig(): void {
  cachedEnv = null
  cachedConfig = null
}
