import { Hono } from 'hono'
import { imageProxyQuerySchema } from '@organizrx/shared'
import { authMiddleware, requireGroup } from '../middleware/auth'
import {
  uploadImage,
  proxyImage,
  getFavicon,
  getImage,
  deleteImage,
  listImages,
  ImageError,
} from '../services/images'

const images = new Hono()

// POST /upload — upload image (admin only)
images.post('/upload', authMiddleware(), requireGroup(0), async (c) => {
  try {
    const body = await c.req.parseBody()
    const file = body['file']

    if (!file || !(file instanceof File)) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'No file provided in "file" field' } },
        400
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const fileData = new Uint8Array(arrayBuffer)
    const result = await uploadImage(fileData, file.name)

    return c.json({ data: result }, 201)
  } catch (error) {
    if (error instanceof ImageError) {
      const status =
        error.code === 'PAYLOAD_TOO_LARGE' ? 413 : error.code === 'VALIDATION_ERROR' ? 400 : 500
      return c.json({ error: { code: error.code, message: error.message } }, status)
    }
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to upload image' } }, 500)
  }
})

// GET /proxy — proxy external image (authenticated users)
images.get('/proxy', authMiddleware(), async (c) => {
  try {
    const parsed = imageProxyQuerySchema.safeParse({ url: c.req.query('url') })

    if (!parsed.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } },
        400
      )
    }

    const result = await proxyImage(parsed.data.url)

    return new Response(Buffer.from(result.data), {
      headers: {
        'Content-Type': result.mimeType,
        'Cache-Control': result.cached ? 'public, max-age=86400' : 'public, max-age=3600',
      },
    })
  } catch (error) {
    if (error instanceof ImageError) {
      const status =
        error.code === 'SSRF_BLOCKED'
          ? 400
          : error.code === 'PAYLOAD_TOO_LARGE'
            ? 413
            : error.code === 'VALIDATION_ERROR'
              ? 400
              : 500
      return c.json({ error: { code: error.code, message: error.message } }, status)
    }
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to proxy image' } }, 500)
  }
})

// GET /favicon.ico — serve favicon (public, no auth)
images.get('/favicon.ico', async (c) => {
  try {
    const result = await getFavicon()
    return new Response(Buffer.from(result.data), {
      headers: {
        'Content-Type': result.mimeType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to serve favicon' } }, 500)
  }
})

// GET / — list uploaded images (admin only)
images.get('/', authMiddleware(), requireGroup(0), async (c) => {
  try {
    const result = await listImages()
    return c.json({ data: result })
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list images' } }, 500)
  }
})

// GET /:filename — serve uploaded image (authenticated)
images.get('/:filename', authMiddleware(), async (c) => {
  try {
    const filename = c.req.param('filename')

    if (!filename) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Filename is required' } }, 400)
    }

    const result = await getImage(filename)
    if (!result) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Image not found' } }, 404)
    }

    return new Response(Buffer.from(result.data), {
      headers: {
        'Content-Type': result.mimeType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to serve image' } }, 500)
  }
})

// DELETE /:filename — delete image (admin only)
images.delete('/:filename', authMiddleware(), requireGroup(0), async (c) => {
  try {
    const filename = c.req.param('filename')

    if (!filename) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Filename is required' } }, 400)
    }

    const deleted = await deleteImage(filename)
    if (!deleted) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Image not found' } }, 404)
    }

    return c.json({ data: { filename, deleted: true } })
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete image' } }, 500)
  }
})

export default images
