import pino, { type Logger } from 'pino'

// Sensitive fields to redact from log output
const REDACT_PATHS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'api_key',
  'authorization',
  'cookie',
  'totp_secret',
  'totp_backup_codes',
  'plex_token',
  'req.headers.authorization',
  'req.headers.cookie',
]

const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info'

let loggerInstance: Logger | null = null

/**
 * Get the singleton pino logger instance.
 * Writes structured JSON to stdout.
 */
export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = pino({
      level: LOG_LEVEL,
      timestamp: pino.stdTimeFunctions.isoTime,
      redact: {
        paths: REDACT_PATHS,
        censor: '[REDACTED]',
      },
      formatters: {
        level(label) {
          return { level: label }
        },
      },
    })
  }
  return loggerInstance
}

/**
 * Create a child logger with a component context name.
 */
export function createChildLogger(name: string): Logger {
  return getLogger().child({ component: name })
}

/**
 * Close the logger (no-op for stdout logger, kept for API compatibility).
 */
export async function closeLogger(): Promise<void> {
  loggerInstance = null
}
