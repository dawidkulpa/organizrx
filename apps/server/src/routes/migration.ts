import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, requireGroup } from '../middleware/auth'
import { getMigrationStatus, runMigration } from '../migration'

const migration = new Hono()

migration.use('*', authMiddleware(), requireGroup(0))

const migrationStartSchema = z.object({
  legacyDbPath: z.string().optional(),
})

let currentProgress: { table: string; current: number; total: number } | null = null
let migrationInProgress = false

migration.get('/status', async (c) => {
  const legacyDbPath = c.req.query('legacyDbPath')
  const status = await getMigrationStatus(legacyDbPath || undefined)
  return c.json({ data: status })
})

migration.get('/progress', (c) => {
  return c.json({
    data: {
      inProgress: migrationInProgress,
      progress: currentProgress,
    },
  })
})

migration.post('/start', async (c) => {
  if (migrationInProgress) {
    return c.json(
      { error: { code: 'MIGRATION_IN_PROGRESS', message: 'A migration is already running' } },
      409
    )
  }

  const body = await c.req.json()
  const parsed = migrationStartSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } },
      400
    )
  }

  migrationInProgress = true
  currentProgress = null

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      const sendEvent = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const result = await runMigration(parsed.data.legacyDbPath, (table, current, total) => {
          currentProgress = { table, current, total }
          sendEvent({ type: 'progress', table, current, total })
        })

        if (result.success) {
          sendEvent({
            type: 'complete',
            tablesProcessed: result.tablesProcessed,
            tablesSkipped: result.tablesSkipped,
            totalRows: result.totalRows,
            backupPath: result.backupPath,
            durationMs: result.durationMs,
          })
        } else {
          sendEvent({
            type: 'error',
            error: result.error,
            tablesProcessed: result.tablesProcessed,
            backupPath: result.backupPath,
          })
        }
      } catch (err) {
        sendEvent({
          type: 'error',
          error: err instanceof Error ? err.message : String(err),
        })
      } finally {
        migrationInProgress = false
        currentProgress = null
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
})

export default migration
