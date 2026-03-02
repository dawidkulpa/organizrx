import { z } from 'zod'

const authConfigSchema = z.object({
  loginAttempts: z.number().int().positive().default(5),
  loginLockoutMs: z.number().int().positive().default(60_000),
  rememberMeDays: z.number().int().positive().default(7),
  bcryptRounds: z.number().int().min(10).max(20).default(12),
  sessionTimeoutMs: z.number().int().positive().default(900_000),
  accessTokenExpiryMs: z.number().int().positive().default(900_000),
  refreshTokenExpiryDays: z.number().int().positive().default(7),
})

const serverConfigSchema = z.object({
  corsOrigins: z.array(z.string()).default(['http://localhost:5173']),
  trustProxy: z.boolean().default(false),
  maxRequestBodySize: z.string().default('10mb'),
})

const loggingConfigSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  maxLogFiles: z.number().int().positive().default(7),
  logDir: z.string().default('./logs'),
})

const securityConfigSchema = z.object({
  rateLimitWindowMs: z.number().int().positive().default(900_000),
  rateLimitMaxRequests: z.number().int().positive().default(100),
  iframeSandbox: z.string().default('allow-scripts allow-same-origin allow-popups'),
})

export const configSchema = z.object({
  auth: authConfigSchema.optional(),
  server: serverConfigSchema.optional(),
  logging: loggingConfigSchema.optional(),
  security: securityConfigSchema.optional(),
})

type RawConfig = z.infer<typeof configSchema>

export interface AppConfig {
  auth: z.infer<typeof authConfigSchema>
  server: z.infer<typeof serverConfigSchema>
  logging: z.infer<typeof loggingConfigSchema>
  security: z.infer<typeof securityConfigSchema>
}

const CONFIG_PATHS = ['./config.json', '/config/config.json']

/**
 * Applies defaults to a parsed config, filling in missing sections.
 */
function applyDefaults(raw: RawConfig): AppConfig {
  return {
    auth: authConfigSchema.parse(raw.auth ?? {}),
    server: serverConfigSchema.parse(raw.server ?? {}),
    logging: loggingConfigSchema.parse(raw.logging ?? {}),
    security: securityConfigSchema.parse(raw.security ?? {}),
  }
}

/**
 * Loads configuration from a JSON file, falling back to defaults.
 * Searches cwd first, then /config/ (Docker volume).
 * Environment LOG_LEVEL overrides the config file value.
 */
export async function loadConfig(envLogLevel?: string): Promise<AppConfig> {
  let rawConfig: unknown = {}

  for (const configPath of CONFIG_PATHS) {
    const file = Bun.file(configPath)
    if (await file.exists()) {
      try {
        rawConfig = await file.json()
      } catch {
        throw new Error(
          `Failed to parse config file at ${configPath}. Ensure it is valid JSON.`
        )
      }
      break
    }
  }

  const result = configSchema.safeParse(rawConfig)

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Config file validation failed:\n${errors}`)
  }

  const config = applyDefaults(result.data)

  // Env LOG_LEVEL overrides config file logging.level
  if (envLogLevel && ['debug', 'info', 'warn', 'error'].includes(envLogLevel)) {
    ;(config.logging as { level: string }).level = envLogLevel
  }

  return Object.freeze(config)
}
