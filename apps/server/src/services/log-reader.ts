import { join, basename } from 'node:path'
import { readdir, readFile, unlink, stat } from 'node:fs/promises'
import { _getLogDir } from './logger'

// Types
export interface LogEntry {
  timestamp: string
  level: string
  msg: string
  [key: string]: unknown
}

export interface LogQueryParams {
  page?: number
  limit?: number
  level?: string
  search?: string
}

export interface LogQueryResult {
  entries: LogEntry[]
  meta: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface LogFileInfo {
  filename: string
  sizeBytes: number
  modifiedAt: string
}

// Pino numeric levels to labels
const PINO_LEVEL_MAP: Record<number, string> = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal',
}

const VALID_LEVELS = new Set(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])

/**
 * Parse a single NDJSON log line into a LogEntry.
 * Returns null if the line cannot be parsed.
 */
function parseLine(line: string): LogEntry | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>

    // Normalize pino numeric level to string label
    let level = String(parsed.level ?? 'info')
    const numLevel = Number(level)
    if (!isNaN(numLevel) && PINO_LEVEL_MAP[numLevel]) {
      level = PINO_LEVEL_MAP[numLevel]
    }

    return {
      ...parsed,
      timestamp: String(parsed.time ?? parsed.timestamp ?? new Date().toISOString()),
      level,
      msg: String(parsed.msg ?? parsed.message ?? ''),
    }
  } catch {
    return null
  }
}

/**
 * Read and parse all log entries from all log files.
 * Entries are returned in reverse chronological order (newest first).
 */
async function readAllEntries(): Promise<LogEntry[]> {
  const logDir = _getLogDir()
  let files: string[]

  try {
    files = await readdir(logDir)
  } catch {
    return []
  }

  const logFiles = files
    .filter((f) => f.endsWith('.log'))
    .sort((a, b) => {
      // app.log first, then app.1.log, app.2.log, etc.
      if (a === 'app.log') return -1
      if (b === 'app.log') return 1
      const numA = parseInt(a.replace('app.', '').replace('.log', ''), 10)
      const numB = parseInt(b.replace('app.', '').replace('.log', ''), 10)
      return numA - numB
    })

  const allEntries: LogEntry[] = []

  for (const file of logFiles) {
    const filepath = join(logDir, file)
    try {
      const content = await readFile(filepath, 'utf-8')
      const lines = content.split('\n')
      for (const line of lines) {
        const entry = parseLine(line)
        if (entry) allEntries.push(entry)
      }
    } catch {
      // Skip unreadable files
    }
  }

  // Sort newest first
  allEntries.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime()
    const timeB = new Date(b.timestamp).getTime()
    return timeB - timeA
  })

  return allEntries
}

/**
 * Query log entries with pagination, level filtering, and search.
 */
export async function queryLogs(params: LogQueryParams): Promise<LogQueryResult> {
  const page = Math.max(1, params.page ?? 1)
  const limit = Math.min(500, Math.max(1, params.limit ?? 50))
  const levelFilter = params.level?.toLowerCase()
  const search = params.search?.toLowerCase()

  let entries = await readAllEntries()

  // Filter by level
  if (levelFilter && VALID_LEVELS.has(levelFilter)) {
    entries = entries.filter((e) => e.level === levelFilter)
  }

  // Filter by search term
  if (search) {
    entries = entries.filter((e) => {
      const msg = e.msg.toLowerCase()
      const component = String(e.component ?? '').toLowerCase()
      return msg.includes(search) || component.includes(search)
    })
  }

  const total = entries.length
  const pages = Math.max(1, Math.ceil(total / limit))
  const offset = (page - 1) * limit
  const paged = entries.slice(offset, offset + limit)

  return {
    entries: paged,
    meta: { page, limit, total, pages },
  }
}

/**
 * List all available log files with sizes and modification dates.
 */
export async function listLogFiles(): Promise<LogFileInfo[]> {
  const logDir = _getLogDir()
  let files: string[]

  try {
    files = await readdir(logDir)
  } catch {
    return []
  }

  const logFiles = files.filter((f) => f.endsWith('.log'))
  const result: LogFileInfo[] = []

  for (const filename of logFiles) {
    try {
      const stats = await stat(join(logDir, filename))
      result.push({
        filename,
        sizeBytes: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      })
    } catch {
      // Skip files we can't stat
    }
  }

  // Sort by modification time, newest first
  result.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())

  return result
}

/**
 * Get the full path to a log file (with safety checks).
 * Returns null if the file doesn't exist or the name is invalid.
 */
export async function getLogFilePath(filename: string): Promise<string | null> {
  const safe = basename(filename)
  if (!safe.endsWith('.log')) return null

  const filepath = join(_getLogDir(), safe)
  try {
    await stat(filepath)
    return filepath
  } catch {
    return null
  }
}

/**
 * Clear all log files from the log directory.
 */
export async function clearLogFiles(): Promise<{ deleted: number }> {
  const logDir = _getLogDir()
  let files: string[]

  try {
    files = await readdir(logDir)
  } catch {
    return { deleted: 0 }
  }

  const logFiles = files.filter((f) => f.endsWith('.log'))
  let deleted = 0

  for (const filename of logFiles) {
    try {
      await unlink(join(logDir, filename))
      deleted++
    } catch {
      // Skip files we can't delete
    }
  }

  return { deleted }
}
