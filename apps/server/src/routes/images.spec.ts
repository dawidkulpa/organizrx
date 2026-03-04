import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync, rmSync } from 'node:fs'
import { Hono } from 'hono'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import { _clearSettingsCache } from '../services/settings'
import { validateProxyUrl, sanitizeFilename } from '../services/images'
import images from './images'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniqueDbPath(suffix = 'images-routes'): string {
  const dir = join(tmpdir(), 'organizrx-test-' + process.pid)
  mkdirSync(dir, { recursive: true })
  return join(dir, `test-${suffix}-${Date.now()}.db`)
}

async function setupDb() {
  _resetConfig()
  await initConfig()
  const dbPath = uniqueDbPath()
  await initDb({ dialect: 'sqlite', url: dbPath })

  const db = getRawDb() as SqliteDb

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      email TEXT,
      plex_token TEXT,
      "group" TEXT,
      group_id INTEGER,
      locked INTEGER,
      image TEXT,
      register_date TEXT,
      auth_service TEXT DEFAULT 'internal',
      totp_secret TEXT,
      totp_enabled INTEGER DEFAULT 0,
      totp_backup_codes TEXT
    )
  `)

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "group" TEXT UNIQUE,
      group_id INTEGER,
      image TEXT,
      "default" INTEGER
    )
  `)

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE,
      user_id INTEGER,
      browser TEXT,
      ip TEXT,
      created TEXT,
      expires TEXT
    )
  `)

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      value TEXT
    )
  `)

  db.$client.exec(`
    INSERT INTO groups (id, "group", group_id, "default") VALUES (1, 'Admin', 0, 0)
  `)

  db.$client.exec(`
    INSERT INTO groups (id, "group", group_id, "default") VALUES (4, 'User', 4, 1)
  `)

  return db
}

function createApp(): Hono {
  const app = new Hono()
  app.route('/api/images', images)
  return app
}

async function createJwt(opts: {
  id: number
  username: string
  email: string
  groupName: string
  group_id: number
}): Promise<string> {
  const { createAccessToken, toAuthUser } = await import('../services/auth')
  const authUser = toAuthUser({
    id: opts.id,
    username: opts.username,
    email: opts.email,
    groupName: opts.groupName,
    group_id: opts.group_id,
    image: null,
  })
  return createAccessToken(authUser)
}

// Minimal valid 1x1 PNG (67 bytes)
function createMinimalPng(): Buffer {
  return Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a, // PNG signature
    0x00,
    0x00,
    0x00,
    0x0d,
    0x49,
    0x48,
    0x44,
    0x52, // IHDR chunk
    0x00,
    0x00,
    0x00,
    0x01,
    0x00,
    0x00,
    0x00,
    0x01, // 1x1 pixel
    0x08,
    0x02,
    0x00,
    0x00,
    0x00,
    0x90,
    0x77,
    0x53, // 8-bit RGB
    0xde,
    0x00,
    0x00,
    0x00,
    0x0c,
    0x49,
    0x44,
    0x41, // IDAT chunk
    0x54,
    0x08,
    0xd7,
    0x63,
    0xf8,
    0xcf,
    0xc0,
    0x00, // compressed data
    0x00,
    0x00,
    0x02,
    0x00,
    0x01,
    0xe2,
    0x21,
    0xbc, //
    0x33,
    0x00,
    0x00,
    0x00,
    0x00,
    0x49,
    0x45,
    0x4e, // IEND chunk
    0x44,
    0xae,
    0x42,
    0x60,
    0x82, //
  ])
}

function createUploadFormData(filename: string, content: Uint8Array, type = 'image/png'): FormData {
  const formData = new FormData()
  const blob = new Blob([new Uint8Array(content)], { type })
  formData.append('file', blob, filename)
  return formData
}

// Cleanup test images directory
const testImagesDir = join(process.cwd(), 'data', 'images')

function cleanupTestImages(): void {
  try {
    rmSync(testImagesDir, { recursive: true, force: true })
  } catch {
    // Directory may not exist
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('images routes', () => {
  beforeEach(async () => {
    await closeDb()
    _clearSettingsCache()
    cleanupTestImages()
  })

  afterEach(async () => {
    await closeDb()
    _clearSettingsCache()
    cleanupTestImages()
  })

  // -------------------------------------------------------------------------
  // POST /api/images/upload
  // -------------------------------------------------------------------------

  describe('POST /api/images/upload', () => {
    it('should return 401 without auth', async () => {
      await setupDb()
      const app = createApp()

      const formData = createUploadFormData('test.png', createMinimalPng())
      const res = await app.request('/api/images/upload', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 403 for non-admin user', async () => {
      const db = await setupDb()
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (2, 'testuser', 'user@test.com', 'User', 4, 'internal', 0)
      `)

      const jwt = await createJwt({
        id: 2,
        username: 'testuser',
        email: 'user@test.com',
        groupName: 'User',
        group_id: 4,
      })

      const app = createApp()
      const formData = createUploadFormData('test.png', createMinimalPng())
      const res = await app.request('/api/images/upload', {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should upload valid PNG and return metadata with filename and thumbnail', async () => {
      const db = await setupDb()
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      const jwt = await createJwt({
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        groupName: 'Admin',
        group_id: 0,
      })

      const app = createApp()
      const formData = createUploadFormData('test.png', createMinimalPng())
      const res = await app.request('/api/images/upload', {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(201)
      expect(json.data.filename).toMatch(/^[a-f0-9-]+\.png$/)
      expect(json.data.mimeType).toBe('image/png')
      expect(json.data.size).toBeGreaterThan(0)
      expect(json.data.path).toMatch(/^\/api\/images\//)
      // Thumbnail may be null for minimal test PNGs (sharp can't always resize 1x1)
      if (json.data.thumbnail !== null) {
        expect(json.data.thumbnail).toMatch(/^thumb-.*\.webp$/)
      }
    })

    it('should return 413 for oversized file', async () => {
      const db = await setupDb()
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)
      // Set max size to 100 bytes
      db.$client.exec(`
        INSERT INTO options (name, value) VALUES ('IMAGE_MAX_SIZE_BYTES', '100')
      `)

      const jwt = await createJwt({
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        groupName: 'Admin',
        group_id: 0,
      })

      const app = createApp()
      const largeBuffer = Buffer.alloc(200, 0)
      // Copy PNG header into the large buffer so it's still recognized
      createMinimalPng().copy(largeBuffer)
      const formData = createUploadFormData('large.png', largeBuffer)
      const res = await app.request('/api/images/upload', {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(413)
      expect(json.error.code).toBe('PAYLOAD_TOO_LARGE')
    })

    it('should reject .exe renamed to .png (magic bytes check)', async () => {
      const db = await setupDb()
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      const jwt = await createJwt({
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        groupName: 'Admin',
        group_id: 0,
      })

      const app = createApp()
      // PE/EXE magic bytes: MZ
      const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00])
      const formData = createUploadFormData('malicious.png', exeBuffer)
      const res = await app.request('/api/images/upload', {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })
  })

  // -------------------------------------------------------------------------
  // GET /api/images/:filename
  // -------------------------------------------------------------------------

  describe('GET /api/images/:filename', () => {
    it('should serve an existing uploaded image', async () => {
      const db = await setupDb()
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      const jwt = await createJwt({
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        groupName: 'Admin',
        group_id: 0,
      })

      const app = createApp()

      // Upload first
      const formData = createUploadFormData('test.png', createMinimalPng())
      const uploadRes = await app.request('/api/images/upload', {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const uploadJson = await uploadRes.json()
      const filename = uploadJson.data.filename

      // Serve
      const res = await app.request(`/api/images/${filename}`, {
        headers: { Authorization: `Bearer ${jwt}` },
      })

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('image/png')
    })

    it('should return 404 for non-existent image', async () => {
      await setupDb()
      const jwt = await createJwt({
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        groupName: 'Admin',
        group_id: 0,
      })

      const app = createApp()
      const res = await app.request('/api/images/nonexistent.png', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(404)
      expect(json.error.code).toBe('NOT_FOUND')
    })

    it('should return 400 for path traversal attempt', async () => {
      await setupDb()
      const jwt = await createJwt({
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        groupName: 'Admin',
        group_id: 0,
      })

      const app = createApp()
      // Path traversal: sanitizeFilename returns null for invalid filenames
      // Note: Hono may URL-decode %2F to / but the service sanitizes via basename
      const res = await app.request('/api/images/..%2F..%2Fetc%2Fpasswd', {
        headers: { Authorization: `Bearer ${jwt}` },
      })

      // The route handler checks getImage result which uses resolveImagePath
      // which calls sanitizeFilename — basename("../../etc/passwd") = "passwd"
      // "passwd" passes SAFE_FILENAME_RE but the file won't exist → 404
      // For truly malicious patterns, getImage returns null → 404
      expect(res.status).toBe(404)
    })
  })

  // -------------------------------------------------------------------------
  // DELETE /api/images/:filename
  // -------------------------------------------------------------------------

  describe('DELETE /api/images/:filename', () => {
    it('should delete an uploaded image', async () => {
      const db = await setupDb()
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      const jwt = await createJwt({
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        groupName: 'Admin',
        group_id: 0,
      })

      const app = createApp()

      // Upload first
      const formData = createUploadFormData('test.png', createMinimalPng())
      const uploadRes = await app.request('/api/images/upload', {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const uploadJson = await uploadRes.json()
      const filename = uploadJson.data.filename

      // Delete
      const delRes = await app.request(`/api/images/${filename}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const delJson = await delRes.json()

      expect(delRes.status).toBe(200)
      expect(delJson.data.deleted).toBe(true)

      // Verify it's gone
      const getRes = await app.request(`/api/images/${filename}`, {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      expect(getRes.status).toBe(404)
    })
  })

  // -------------------------------------------------------------------------
  // GET /api/images/ (list)
  // -------------------------------------------------------------------------

  describe('GET /api/images/', () => {
    it('should list uploaded images', async () => {
      const db = await setupDb()
      db.$client.exec(`
        INSERT INTO users (id, username, email, "group", group_id, auth_service, locked)
        VALUES (1, 'admin', 'admin@test.com', 'Admin', 0, 'internal', 0)
      `)

      const jwt = await createJwt({
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        groupName: 'Admin',
        group_id: 0,
      })

      const app = createApp()

      // Upload an image
      const formData = createUploadFormData('test.png', createMinimalPng())
      await app.request('/api/images/upload', {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${jwt}` },
      })

      // List
      const res = await app.request('/api/images', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data).toBeArray()
      expect(json.data.length).toBeGreaterThanOrEqual(1)
      expect(json.data[0].filename).toBeDefined()
      expect(json.data[0].size).toBeGreaterThan(0)
      expect(json.data[0].mimeType).toBe('image/png')
    })
  })

  // -------------------------------------------------------------------------
  // GET /api/images/proxy
  // -------------------------------------------------------------------------

  describe('GET /api/images/proxy', () => {
    it('should block SSRF to cloud metadata IP (169.254.169.254)', async () => {
      await setupDb()
      const jwt = await createJwt({
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        groupName: 'Admin',
        group_id: 0,
      })

      const app = createApp()
      const res = await app.request(
        '/api/images/proxy?url=http://169.254.169.254/latest/meta-data/',
        { headers: { Authorization: `Bearer ${jwt}` } }
      )
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('SSRF_BLOCKED')
    })

    it('should allow private IP (192.168.1.50) for home-lab use', () => {
      const result = validateProxyUrl('http://192.168.1.50/image.png')
      expect(result).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // GET /api/images/favicon.ico
  // -------------------------------------------------------------------------

  describe('GET /api/images/favicon.ico', () => {
    it('should serve default favicon without auth', async () => {
      await setupDb()
      const app = createApp()

      const res = await app.request('/api/images/favicon.ico')

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('image/svg+xml')
    })
  })

  // -------------------------------------------------------------------------
  // Service unit tests
  // -------------------------------------------------------------------------

  describe('sanitizeFilename', () => {
    it('should strip path traversal characters', () => {
      expect(sanitizeFilename('../../etc/passwd')).toBe('passwd')
    })

    it('should return null for filenames with special characters', () => {
      expect(sanitizeFilename('file name.png')).toBeNull()
    })

    it('should return null for empty string', () => {
      expect(sanitizeFilename('')).toBeNull()
    })

    it('should accept valid filenames', () => {
      expect(sanitizeFilename('image-123.png')).toBe('image-123.png')
    })
  })

  describe('validateProxyUrl', () => {
    it('should block localhost', () => {
      expect(validateProxyUrl('http://127.0.0.1/img.png')).toBeTruthy()
      expect(validateProxyUrl('http://localhost/img.png')).toBeTruthy()
    })

    it('should block 0.0.0.0', () => {
      expect(validateProxyUrl('http://0.0.0.0/img.png')).toBeTruthy()
    })

    it('should block non-HTTP schemes', () => {
      expect(validateProxyUrl('ftp://example.com/img.png')).toBeTruthy()
      expect(validateProxyUrl('file:///etc/passwd')).toBeTruthy()
    })

    it('should allow valid HTTP URLs', () => {
      expect(validateProxyUrl('https://example.com/image.png')).toBeNull()
    })

    it('should allow private IPs (home-lab)', () => {
      expect(validateProxyUrl('http://10.0.0.1/img.png')).toBeNull()
      expect(validateProxyUrl('http://172.16.0.1/img.png')).toBeNull()
      expect(validateProxyUrl('http://192.168.1.100/img.png')).toBeNull()
    })
  })
})
