import { Hono } from 'hono'
import { createBackupRequestSchema } from '@organizrx/shared'
import { authMiddleware, requireGroup } from '../middleware/auth'
import {
  createBackup,
  listBackups,
  getBackupPath,
  deleteBackup,
  restoreBackup,
} from '../services/backup'

const backup = new Hono()

// ALL backup endpoints are admin-only (group 0)
backup.use('*', authMiddleware(), requireGroup(0))

// POST / — create backup (returns metadata)
backup.post('/', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const parsed = createBackupRequestSchema.safeParse(body)

    if (!parsed.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } },
        400
      )
    }

    const result = await createBackup(parsed.data.description)
    return c.json({ data: result }, 201)
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create backup' } }, 500)
  }
})

// GET / — list all backups (returns array with metadata)
backup.get('/', async (c) => {
  try {
    const backups = await listBackups()
    return c.json({ data: backups })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list backups' } }, 500)
  }
})

// GET /:id/download — download backup zip file
backup.get('/:id/download', async (c) => {
  try {
    const filename = c.req.param('id')
    const filepath = await getBackupPath(filename)

    if (!filepath) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Backup not found' } }, 404)
    }

    const file = Bun.file(filepath)
    const buffer = await file.arrayBuffer()

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.byteLength),
      },
    })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to download backup' } }, 500)
  }
})

// POST /restore — upload + restore backup (multipart form)
backup.post('/restore', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file')
    const confirmRestore = formData.get('confirmRestore')

    if (confirmRestore !== 'true') {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Must confirm restore' } }, 400)
    }

    if (!file || !(file instanceof File)) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Backup file is required' } },
        400
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const result = await restoreBackup(buffer)
    return c.json({ data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to restore backup'
    return c.json({ error: { code: 'INTERNAL_ERROR', message } }, 500)
  }
})

// DELETE /:id — delete a backup
backup.delete('/:id', async (c) => {
  try {
    const filename = c.req.param('id')
    const deleted = await deleteBackup(filename)

    if (!deleted) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Backup not found' } }, 404)
    }

    return c.json({ data: { filename, deleted: true } })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete backup' } }, 500)
  }
})

export default backup
