import { Hono } from 'hono'
import { authMiddleware, requireGroup } from '../middleware/auth'
import { getMigrationStatus, runMigration } from '../migration'

const migration = new Hono()

migration.use('*', authMiddleware(), requireGroup(0))

let currentProgress: { step: string; current: number; total: number } | null = null
let migrationInProgress = false

migration.get('/status', async (c) => {
  const status = await getMigrationStatus()
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

  migrationInProgress = true
  currentProgress = null

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      const sendEvent = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const result = await runMigration((step, current, total) => {
          currentProgress = { step, current, total }
          sendEvent({ type: 'progress', step, current, total })
        })

        if (result.success) {
          sendEvent({
            type: 'complete',
            columnsAdded: result.columnsAdded,
            tablesCleared: result.tablesCleared,
            transformsApplied: result.transformsApplied,
            backupPath: result.backupPath,
            durationMs: result.durationMs,
          })
        } else {
          sendEvent({
            type: 'error',
            error: result.error,
            columnsAdded: result.columnsAdded,
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
