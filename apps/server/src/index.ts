import { Hono } from 'hono'
import { initConfig } from './config'
import { initDb, healthCheck, closeDb } from './db'
import authRoutes from './routes/auth'

const { env } = await initConfig()

// Initialize database connection
await initDb({
  dialect: env.DATABASE_DIALECT,
  url: env.DATABASE_URL!,
})

const app = new Hono()

app.route('/api/auth', authRoutes)

// Health check endpoint — includes DB status
app.get('/api/health', async (c) => {
  const dbHealth = await healthCheck()
  return c.json({
    status: dbHealth.ok ? 'ok' : 'degraded',
    version: '0.0.1',
    db: dbHealth,
  })
})

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404)
})

// Graceful shutdown
const shutdown = async () => {
  await closeDb()
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

export default {
  port: env.PORT,
  hostname: env.HOST,
  fetch: app.fetch,
}
