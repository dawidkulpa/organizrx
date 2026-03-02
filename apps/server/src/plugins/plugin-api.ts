import type { PluginAPI, PluginSettings, PluginLogger, PluginHTTP } from '@organizrx/plugin-sdk'
import {
  getSetting,
  getSettingNumber,
  getSettingBoolean,
  getSettingJSON,
  setSetting,
} from '../services/settings'

// ---------------------------------------------------------------------------
// Settings — scoped to `plugin:{pluginId}:{key}`
// ---------------------------------------------------------------------------

function createPluginSettings(pluginId: string): PluginSettings {
  const prefix = `plugin:${pluginId}:`

  return {
    async get(key: string): Promise<string | null> {
      return getSetting(`${prefix}${key}`)
    },
    async getNumber(key: string, defaultValue = 0): Promise<number> {
      return getSettingNumber(`${prefix}${key}`, defaultValue)
    },
    async getBoolean(key: string, defaultValue = false): Promise<boolean> {
      return getSettingBoolean(`${prefix}${key}`, defaultValue)
    },
    async getJSON<T>(key: string, defaultValue?: T): Promise<T> {
      return getSettingJSON<T>(`${prefix}${key}`, defaultValue as T)
    },
    async set(key: string, value: string): Promise<void> {
      await setSetting(`${prefix}${key}`, value)
    },
  }
}

// ---------------------------------------------------------------------------
// Logger — structured JSON output with plugin context
// ---------------------------------------------------------------------------

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function shouldLog(current: LogLevel, threshold: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[current] >= LOG_LEVEL_PRIORITY[threshold]
}

function createPluginLogger(pluginId: string, level: LogLevel = 'info'): PluginLogger {
  const emit = (lvl: LogLevel, msg: string, data?: Record<string, unknown>): void => {
    if (!shouldLog(lvl, level)) return

    const entry = {
      level: lvl,
      plugin: pluginId,
      msg,
      time: new Date().toISOString(),
      ...data,
    }

    // Use stderr for structured output (same as pino convention)
    const line = JSON.stringify(entry)
    switch (lvl) {
      case 'error':
        process.stderr.write(line + '\n')
        break
      case 'warn':
        process.stderr.write(line + '\n')
        break
      default:
        process.stdout.write(line + '\n')
    }
  }

  return {
    info: (msg, data) => emit('info', msg, data),
    warn: (msg, data) => emit('warn', msg, data),
    error: (msg, data) => emit('error', msg, data),
    debug: (msg, data) => emit('debug', msg, data),
  }
}

// ---------------------------------------------------------------------------
// HTTP — fetch wrapper with SSRF protection and timeout
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 30_000

/**
 * Validates a URL for SSRF safety:
 * - MUST be http or https
 * - MUST NOT be cloud metadata endpoint (169.254.169.254)
 * - MUST NOT be localhost/loopback (127.x, ::1)
 * - ALLOWS private IPs (192.168.x, 10.x, 172.16-31.x) for home-lab use
 */
export function validateUrl(url: string): { valid: boolean; reason?: string } {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { valid: false, reason: 'Invalid URL' }
  }

  // Block non-HTTP schemes
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: `Blocked scheme: ${parsed.protocol}` }
  }

  // Strip IPv6 brackets for consistent comparison

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '')

  // Block cloud metadata endpoint
  if (hostname === '169.254.169.254') {
    return { valid: false, reason: 'Blocked: cloud metadata endpoint' }
  }

  // Block loopback addresses
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.startsWith('127.')
  ) {
    return { valid: false, reason: 'Blocked: loopback address' }
  }

  return { valid: true }
}

function createPluginHTTP(pluginId: string): PluginHTTP {
  return {
    async fetch(url: string, options?: RequestInit): Promise<Response> {
      const check = validateUrl(url)
      if (!check.valid) {
        throw new Error(`Plugin HTTP blocked: ${check.reason} (url: ${url})`)
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

      try {
        const mergedHeaders = new Headers(options?.headers)
        if (!mergedHeaders.has('User-Agent')) {
          mergedHeaders.set('User-Agent', `OrganizrX-Plugin/${pluginId}`)
        }

        return await globalThis.fetch(url, {
          ...options,
          headers: mergedHeaders,
          signal: options?.signal ?? controller.signal,
        })
      } finally {
        clearTimeout(timeoutId)
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createPluginAPI(pluginId: string, logLevel?: LogLevel): PluginAPI {
  return {
    settings: createPluginSettings(pluginId),
    logger: createPluginLogger(pluginId, logLevel),
    http: createPluginHTTP(pluginId),
  }
}
