import { readdir, unlink, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { getSetting } from './settings'
import {
  IMAGES_DIR,
  CACHE_DIR,
  DEFAULT_MAX_SIZE_BYTES,
  MAX_PROXY_SIZE_BYTES,
  PROXY_TIMEOUT_MS,
  DEFAULT_FAVICON_SVG,
  MIME_TO_EXT,
  ensureDirectories,
  resolveImagePath,
  validateProxyUrl,
  detectMimeType,
  ImageError,
  type UploadResult,
  type ImageListItem,
  sanitizeFilename,
} from './image-utils'

// Re-export for external consumers
export {
  ImageError,
  validateProxyUrl,
  sanitizeFilename,
  detectMimeType,
  type UploadResult,
  type ImageListItem,
}

// Upload
export async function uploadImage(
  fileData: Uint8Array,
  originalName: string
): Promise<UploadResult> {
  await ensureDirectories()

  const maxSizeSetting = await getSetting('IMAGE_MAX_SIZE_BYTES')
  const maxSize = maxSizeSetting ? parseInt(maxSizeSetting, 10) : DEFAULT_MAX_SIZE_BYTES

  if (fileData.byteLength > maxSize) {
    throw new ImageError('PAYLOAD_TOO_LARGE', `File size exceeds maximum of ${maxSize} bytes`)
  }

  const mimeType = await detectMimeType(fileData)
  if (!mimeType) {
    throw new ImageError(
      'VALIDATION_ERROR',
      'File type not accepted. Allowed: PNG, JPEG, GIF, WebP, SVG, ICO'
    )
  }

  const ext = (MIME_TO_EXT[mimeType] ?? extname(originalName).replace('.', '')) || 'bin'
  const uuid = crypto.randomUUID()
  const filename = `${uuid}.${ext}`
  const filePath = join(IMAGES_DIR, filename)

  await Bun.write(filePath, fileData)

  let thumbnail: string | null = null
  if (mimeType !== 'image/svg+xml' && mimeType !== 'image/x-icon') {
    try {
      const thumbFilename = `thumb-${uuid}.webp`
      const thumbPath = join(IMAGES_DIR, thumbFilename)
      await sharp(Buffer.from(fileData))
        .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(thumbPath)
      thumbnail = thumbFilename
    } catch {
      thumbnail = null
    }
  }

  return {
    path: `/api/images/${filename}`,
    filename,
    thumbnail,
    size: fileData.byteLength,
    mimeType,
  }
}

// Proxy
export async function proxyImage(
  url: string
): Promise<{ data: Uint8Array; mimeType: string; cached: boolean }> {
  await ensureDirectories()

  const ssrfError = validateProxyUrl(url)
  if (ssrfError) {
    throw new ImageError('SSRF_BLOCKED', ssrfError)
  }

  const urlHash = createHash('sha256').update(url).digest('hex')
  const cacheMetaPath = join(CACHE_DIR, `${urlHash}.meta`)
  const cacheDataPath = join(CACHE_DIR, `${urlHash}.data`)

  try {
    const metaFile = Bun.file(cacheMetaPath)
    if (await metaFile.exists()) {
      const meta = JSON.parse(await metaFile.text()) as { mimeType: string }
      const dataFile = Bun.file(cacheDataPath)
      if (await dataFile.exists()) {
        const data = new Uint8Array(await dataFile.arrayBuffer())
        return { data, mimeType: meta.mimeType, cached: true }
      }
    }
  } catch {
    // Cache miss
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'OrganizrX Image Proxy',
      },
    })
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ImageError('INTERNAL_ERROR', 'Proxy request timed out')
    }
    throw new ImageError('INTERNAL_ERROR', 'Failed to fetch image')
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    throw new ImageError('INTERNAL_ERROR', `Upstream returned status ${response.status}`)
  }

  const contentType = response.headers.get('Content-Type') ?? ''
  if (!contentType.startsWith('image/')) {
    throw new ImageError('VALIDATION_ERROR', 'URL does not point to an image')
  }

  const arrayBuffer = await response.arrayBuffer()
  const data = new Uint8Array(arrayBuffer)

  if (data.byteLength > MAX_PROXY_SIZE_BYTES) {
    throw new ImageError('PAYLOAD_TOO_LARGE', 'Proxied image exceeds 10MB limit')
  }

  const detected = await detectMimeType(data)
  const mimeType = detected ?? contentType.split(';')[0].trim()

  try {
    await Bun.write(cacheDataPath, data)
    await Bun.write(cacheMetaPath, JSON.stringify({ mimeType }))
  } catch {
    // Non-fatal cache write failure
  }

  return { data, mimeType, cached: false }
}

// Favicon
export async function getFavicon(): Promise<{ data: Uint8Array; mimeType: string }> {
  const faviconPath = await getSetting('FAVICON_PATH')

  if (faviconPath) {
    const resolved = resolveImagePath(faviconPath)
    if (resolved) {
      try {
        const file = Bun.file(resolved)
        if (await file.exists()) {
          const data = new Uint8Array(await file.arrayBuffer())
          const mimeType = (await detectMimeType(data)) ?? 'image/x-icon'
          return { data, mimeType }
        }
      } catch {
        // Fall through to default
      }
    }
  }

  const data = new TextEncoder().encode(DEFAULT_FAVICON_SVG)
  return { data, mimeType: 'image/svg+xml' }
}

// Serve
export async function getImage(
  filename: string
): Promise<{ data: Uint8Array; mimeType: string } | null> {
  const filePath = resolveImagePath(filename)
  if (!filePath) return null

  try {
    const file = Bun.file(filePath)
    if (!(await file.exists())) return null

    const data = new Uint8Array(await file.arrayBuffer())
    const mimeType = (await detectMimeType(data)) ?? 'application/octet-stream'
    return { data, mimeType }
  } catch {
    return null
  }
}

// Delete
export async function deleteImage(filename: string): Promise<boolean> {
  const filePath = resolveImagePath(filename)
  if (!filePath) return false

  try {
    const file = Bun.file(filePath)
    if (!(await file.exists())) return false

    await unlink(filePath)

    const nameWithoutExt = filename.replace(/\.[^.]+$/, '')
    const thumbPath = join(IMAGES_DIR, `thumb-${nameWithoutExt}.webp`)
    try {
      await unlink(thumbPath)
    } catch {
      // Thumbnail may not exist
    }

    return true
  } catch {
    return false
  }
}

// List
export async function listImages(): Promise<ImageListItem[]> {
  await ensureDirectories()

  let entries: string[]
  try {
    entries = await readdir(IMAGES_DIR)
  } catch {
    return []
  }

  const items: ImageListItem[] = []

  for (const entry of entries) {
    if (entry === 'cache' || entry.startsWith('thumb-') || entry.endsWith('.meta')) {
      continue
    }

    const filePath = join(IMAGES_DIR, entry)

    try {
      const fileStat = await stat(filePath)
      if (!fileStat.isFile()) continue

      const file = Bun.file(filePath)
      const buffer = new Uint8Array(await file.arrayBuffer())
      const mimeType = (await detectMimeType(buffer)) ?? 'application/octet-stream'

      const nameWithoutExt = entry.replace(/\.[^.]+$/, '')
      const thumbFilename = `thumb-${nameWithoutExt}.webp`
      let thumbnailUrl: string | null = null

      try {
        const thumbFile = Bun.file(join(IMAGES_DIR, thumbFilename))
        if (await thumbFile.exists()) {
          thumbnailUrl = `/api/images/${thumbFilename}`
        }
      } catch {
        // No thumbnail
      }

      items.push({
        filename: entry,
        size: fileStat.size,
        mimeType,
        createdAt: fileStat.birthtime.toISOString(),
        thumbnailUrl,
      })
    } catch {
      // Skip unreadable files
    }
  }

  return items
}
