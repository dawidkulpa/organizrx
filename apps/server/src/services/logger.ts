import { join } from 'node:path'
import { mkdir, rename, unlink, stat } from 'node:fs/promises'
import { createWriteStream, type WriteStream } from 'node:fs'
import pino, { type Logger } from 'pino'

// Constants
const LOG_DIR = join(process.cwd(), 'data', 'logs')
const LOG_FILE = 'app.log'
const MAX_LOG_FILES = 5
const MAX_LOG_SIZE = 10 * 1024 * 1024 // 10MB

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

let loggerInstance: Logger | null = null
let fileStream: WriteStream | null = null
let rotationPending = false

// Ensure log directory exists
async function ensureLogDir(): Promise<void> {
  await mkdir(LOG_DIR, { recursive: true })
}

// Get the current log file path
function getLogFilePath(): string {
  return join(LOG_DIR, LOG_FILE)
}

// Check file size and rotate if needed
async function checkRotation(): Promise<void> {
  if (rotationPending) return
  rotationPending = true

  try {
    const logPath = getLogFilePath()
    let fileSize = 0

    try {
      const stats = await stat(logPath)
      fileSize = stats.size
    } catch {
      // File doesn't exist yet
      return
    }

    if (fileSize < MAX_LOG_SIZE) return

    // Close current stream before rotating
    if (fileStream) {
      fileStream.end()
      fileStream = null
    }

    // Rotate files: app.4.log -> delete, app.3.log -> app.4.log, ... app.log -> app.1.log
    for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
      const src = i === 1 ? logPath : join(LOG_DIR, `app.${i - 1}.log`)
      const dst = join(LOG_DIR, `app.${i}.log`)

      try {
        await stat(src)
        if (i === MAX_LOG_FILES - 1) {
          // Delete the oldest if it exists
          try {
            await unlink(dst)
          } catch {
            // dst may not exist
          }
        }
        await rename(src, dst)
      } catch {
        // Source doesn't exist, skip
      }
    }

    // Reopen stream for new log file
    fileStream = createWriteStream(logPath, { flags: 'a' })
    if (loggerInstance) {
      // Rebind pino destination
      loggerInstance = createPinoInstance(fileStream)
    }
  } finally {
    rotationPending = false
  }
}

// Create the pino instance writing to a stream
function createPinoInstance(stream: WriteStream): Logger {
  return pino(
    {
      level: 'trace',
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
    },
    stream
  )
}

// Schedule periodic rotation checks
let rotationInterval: ReturnType<typeof setInterval> | null = null

function startRotationCheck(): void {
  if (rotationInterval) return
  // Check every 60 seconds
  rotationInterval = setInterval(() => {
    checkRotation().catch(() => {
      // Silently handle rotation errors
    })
  }, 60_000)
  // Don't block process exit
  if (rotationInterval && typeof rotationInterval === 'object' && 'unref' in rotationInterval) {
    rotationInterval.unref()
  }
}

/**
 * Initialize and return the singleton pino logger instance.
 * Writes structured NDJSON to `data/logs/app.log` with automatic rotation.
 */
export async function initLogger(): Promise<Logger> {
  if (loggerInstance) return loggerInstance

  await ensureLogDir()

  const logPath = getLogFilePath()
  fileStream = createWriteStream(logPath, { flags: 'a' })
  loggerInstance = createPinoInstance(fileStream)

  startRotationCheck()

  return loggerInstance
}

/**
 * Get the current logger instance.
 * Falls back to a pino instance writing to stdout if not yet initialized.
 */
export function getLogger(): Logger {
  if (!loggerInstance) {
    // Fallback: write to stdout until initLogger() is called
    loggerInstance = pino({
      level: 'trace',
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
 * Flush and close the log file stream.
 */
export async function closeLogger(): Promise<void> {
  if (rotationInterval) {
    clearInterval(rotationInterval)
    rotationInterval = null
  }
  if (fileStream) {
    fileStream.end()
    fileStream = null
  }
  loggerInstance = null
}

// Testing helper
export function _getLogDir(): string {
  return LOG_DIR
}
