import { mkdir } from 'node:fs/promises'
import { join, basename, resolve } from 'node:path'
import { fileTypeFromBuffer } from 'file-type'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const IMAGES_DIR = resolve('./data/images')
export const CACHE_DIR = join(IMAGES_DIR, 'cache')

export const ACCEPTED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/x-icon',
])

export const DEFAULT_MAX_SIZE_BYTES = 5_242_880
export const MAX_PROXY_SIZE_BYTES = 10_485_760
export const PROXY_TIMEOUT_MS = 10_000

export const DEFAULT_FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#4caf50"/>
  <text x="16" y="23" font-size="20" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="bold">O</text>
</svg>`

export const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UploadResult {
  path: string
  filename: string
  thumbnail: string | null
  size: number
  mimeType: string
}

export interface ImageListItem {
  filename: string
  size: number
  mimeType: string
  createdAt: string
  thumbnailUrl: string | null
}

// ---------------------------------------------------------------------------
// Path safety
// ---------------------------------------------------------------------------

const SAFE_FILENAME_RE = /^[a-zA-Z0-9._-]+$/

/**
 * Sanitize a filename to prevent path traversal.
 * Returns null if the filename is invalid.
 */
export function sanitizeFilename(raw: string): string | null {
  let name = raw.replace(/\0/g, '')
  name = basename(name)

  if (!name || !SAFE_FILENAME_RE.test(name)) {
    return null
  }

  return name
}

export function resolveImagePath(filename: string): string | null {
  const sanitized = sanitizeFilename(filename)
  if (!sanitized) return null

  const resolved = resolve(IMAGES_DIR, sanitized)
  if (!resolved.startsWith(IMAGES_DIR)) {
    return null
  }

  return resolved
}

// ---------------------------------------------------------------------------
// Directory setup
// ---------------------------------------------------------------------------

export async function ensureDirectories(): Promise<void> {
  await mkdir(IMAGES_DIR, { recursive: true })
  await mkdir(CACHE_DIR, { recursive: true })
}

// ---------------------------------------------------------------------------
// SSRF protection
// ---------------------------------------------------------------------------

const BLOCKED_IPS = new Set([
  '169.254.169.254',
  '::ffff:169.254.169.254',
  'fd00:ec2::254',
  '168.63.129.16',
  '127.0.0.1',
  '::1',
  '0.0.0.0',
  '::',
  'localhost',
  '0:0:0:0:0:0:0:1',
])

function isBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase()
  if (BLOCKED_IPS.has(lower)) return true
  if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(lower)) return true
  return false
}

/**
 * Validate a proxy URL for SSRF attacks.
 * Returns null on success, error message on failure.
 */
export function validateProxyUrl(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return 'Invalid URL format'
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return 'Only http:// and https:// protocols are allowed'
  }

  if (!parsed.hostname) {
    return 'URL must have a hostname'
  }

  if (isBlockedHost(parsed.hostname)) {
    return `Blocked host: ${parsed.hostname}`
  }

  return null
}

// ---------------------------------------------------------------------------
// Mime type detection
// ---------------------------------------------------------------------------

/**
 * Detect MIME type via magic bytes, with SVG fallback for XML-based content.
 */
export async function detectMimeType(buffer: Uint8Array): Promise<string | null> {
  const result = await fileTypeFromBuffer(buffer)
  if (result && ACCEPTED_MIME_TYPES.has(result.mime)) {
    return result.mime
  }

  const textStart = new TextDecoder('utf-8', { fatal: false }).decode(buffer.slice(0, 512)).trim()
  if (
    textStart.startsWith('<svg') ||
    (textStart.startsWith('<?xml') && textStart.includes('<svg'))
  ) {
    return 'image/svg+xml'
  }

  return null
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class ImageError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'ImageError'
  }
}
