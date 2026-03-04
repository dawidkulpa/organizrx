import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, requireGroup } from '../middleware/auth'
import { queryLogs, listLogFiles, getLogFilePath, clearLogFiles } from '../services/log-reader'

const logs = new Hono()

// All log endpoints are admin-only (group 0)
logs.use('*', authMiddleware(), requireGroup(0))

// Query param schema for GET /
const logQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(500).optional().default(50),
  level: z.string().optional(),
  search: z.string().optional(),
})

// GET / — List log entries (paginated, filtered)
logs.get('/', async (c) => {
  try {
    const raw = {
      page: c.req.query('page'),
      limit: c.req.query('limit'),
      level: c.req.query('level'),
      search: c.req.query('search'),
    }

    const parsed = logQuerySchema.safeParse(raw)
    if (!parsed.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } },
        400
      )
    }

    const result = await queryLogs(parsed.data)
    return c.json({ data: result.entries, meta: result.meta })
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to read log entries' } }, 500)
  }
})

// GET /files — List available log files with sizes
logs.get('/files', async (c) => {
  try {
    const files = await listLogFiles()
    return c.json({ data: files })
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list log files' } }, 500)
  }
})

// GET /download/:filename — Download a specific log file
logs.get('/download/:filename', async (c) => {
  try {
    const filename = c.req.param('filename')
    const filepath = await getLogFilePath(filename)

    if (!filepath) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Log file not found' } }, 404)
    }

    const file = Bun.file(filepath)
    const buffer = await file.arrayBuffer()

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.byteLength),
      },
    })
  } catch {
    return c.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to download log file' } },
      500
    )
  }
})

// DELETE / — Clear all log files
logs.delete('/', async (c) => {
  try {
    const result = await clearLogFiles()
    return c.json({ data: result })
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to clear log files' } }, 500)
  }
})

export default logs
