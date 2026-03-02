import { Hono } from 'hono'
import { initConfig } from './config'
import { initDb, healthCheck, closeDb } from './db'
import authRoutes from './routes/auth'
import userRoutes from './routes/users'
import categoryRoutes from './routes/categories'
import groupRoutes from './routes/groups'
import bookmarkRoutes from './routes/bookmarks'
import settingsRoutes from './routes/settings'

const { env } = await initConfig()

// Initialize database connection
await initDb({
  dialect: env.DATABASE_DIALECT,
  url: env.DATABASE_URL!,
})

const app = new Hono()

app.route('/api/auth', authRoutes)
app.route('/api/users', userRoutes)
app.route('/api/categories', categoryRoutes)
app.route('/api/groups', groupRoutes)
app.route('/api/settings', settingsRoutes)
app.route('/api/bookmarks', bookmarkRoutes)

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
