import { Hono } from 'hono'
import { initConfig } from './config'
import { initDb, healthCheck, closeDb } from './db'
import authRoutes from './routes/auth'
import plexAuthRoutes from './routes/auth-plex'
import ldapAuthRoutes from './routes/auth-ldap'
import auth2faRoutes from './routes/auth-2fa'
import userRoutes from './routes/users'
import categoryRoutes from './routes/categories'
import groupRoutes from './routes/groups'
import bookmarkRoutes from './routes/bookmarks'
import settingsRoutes from './routes/settings'
import tabRoutes from './routes/tabs'
import inviteRoutes from './routes/invites'
import ssoRoutes from './routes/sso'
import oidcAuthRoutes from './routes/auth-oidc'
import { authProxyMiddleware } from './middleware/auth-proxy'
import { loadAllPlugins, mountPluginRoutes, unloadAllPlugins } from './plugins'

const { env } = await initConfig()

// Initialize database connection
await initDb({
  dialect: env.DATABASE_DIALECT,
  url: env.DATABASE_URL!,
})

// Load plugins (after DB, before route mounting)
await loadAllPlugins()

const app = new Hono()

app.use('/api/*', authProxyMiddleware())

app.route('/api/auth', authRoutes)
app.route('/api/auth', plexAuthRoutes)
app.route('/api/auth', ldapAuthRoutes)
app.route('/api/auth', oidcAuthRoutes)
app.route('/api/auth/2fa', auth2faRoutes)
app.route('/api/users', userRoutes)
app.route('/api/categories', categoryRoutes)
app.route('/api/groups', groupRoutes)
app.route('/api/settings', settingsRoutes)
app.route('/api/bookmarks', bookmarkRoutes)
app.route('/api/tabs', tabRoutes)
app.route('/api/invites', inviteRoutes)
app.route('/api/sso', ssoRoutes)

// Mount plugin routes at /api/plugins/{pluginId}/
mountPluginRoutes(app)

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
  await unloadAllPlugins()
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
