import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/bun'
import { checkSetupComplete } from './services/setup'
import { initConfig } from './config'
import { getConfig } from './config'
import { initDb, healthCheck, closeDb, runMigrations, seedDefaultGroups } from './db'
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
import pluginManagementRoutes from './routes/plugins'
import wizardRoutes from './routes/wizard'
import { getSetting } from './services/settings'
import migrationRoutes from './routes/migration'
import backupRoutes from './routes/backup'
import connectionTesterRoutes from './routes/connection-tester'
import { getMigrationStatus, runMigration } from './migration'
import imageRoutes from './routes/images'
import updateRoutes from './routes/update'
import logRoutes from './routes/logs'

const { env } = await initConfig()

// Initialize database connection
await initDb({
  dialect: env.DATABASE_DIALECT,
  url: env.DATABASE_URL!,
})

// Run pending Drizzle migrations (SQLite only; MySQL/PG skip)
await runMigrations()

// Auto-run in-place schema migration for old Organizr databases.
// Detects missing TOTP columns and ALTER TABLEs them in.
{
  const status = await getMigrationStatus()
  if (status.needsMigration) {
    console.log('[migration] Old Organizr schema detected — running in-place migration…')
    const result = await runMigration((step, current, total) => {
      console.log(`[migration] ${step} (${current}/${total})`)
    })
    if (result.success) {
      console.log(`[migration] Done in ${result.durationMs}ms — columns added: ${result.columnsAdded.join(', ') || 'none'}`)
    } else {
      console.error(`[migration] FAILED: ${result.error}`)
      process.exit(1)
    }
  }
}
// Seed default groups if they don't exist
await seedDefaultGroups()

// Load plugins (after DB, before route mounting)
await loadAllPlugins()

const app = new Hono()


// ── CORS middleware (credentials: true for httpOnly refresh cookie) ──
const { server: serverConfig } = getConfig()
app.use('/api/*', cors({
  origin: serverConfig.corsOrigins,
  credentials: true,
}))

app.use('/api/*', authProxyMiddleware())


// ── Public settings endpoint (no auth) ─────────────────────────
// Exposes only allowlisted settings needed by the Login page.
const PUBLIC_SETTINGS_KEYS = ['LDAP_ENABLED', 'PLEX_ENABLED', 'OIDC_ENABLED', 'SITE_TITLE']
app.get('/api/settings/public', async (c) => {
  try {
    const results: Record<string, string> = {}
    for (const key of PUBLIC_SETTINGS_KEYS) {
      const value = await getSetting(key)
      if (value !== null) {
        results[key] = value
      }
    }
    return c.json({ data: results })
  } catch {
    // DB not ready (table missing, first-run before wizard) — return empty
    return c.json({ data: {} })
  }
})

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
app.route('/api/wizard', wizardRoutes)
app.route('/api/migration', migrationRoutes)
app.route('/api/backup', backupRoutes)
app.route('/api/test-connection', connectionTesterRoutes)
app.route('/api/images', imageRoutes)
app.route('/api/update', updateRoutes)
app.route('/api/logs', logRoutes)

// Plugin management routes (BEFORE individual plugin routes)
app.route('/api/plugins', pluginManagementRoutes)

// Mount plugin routes at /api/plugins/{pluginId}/
mountPluginRoutes(app)

// Top-level favicon redirect
app.get('/favicon.ico', async (c) => {
  return c.redirect('/api/images/favicon.ico', 301)
})

// Health check endpoint — includes DB status
app.get('/api/health', async (c) => {
  const dbHealth = await healthCheck()
  return c.json({
    status: dbHealth.ok ? 'ok' : 'degraded',
    version: '0.0.1',
    db: dbHealth,
  })
})

// ── Static file serving (built SPA) ────────────────────────────
// Serve static assets from the Vite build output.
// In dev mode the dist folder doesn't exist, so serveStatic simply
// falls through and the SPA is served by Vite on port 5173.
app.use('/*', serveStatic({ root: './apps/web/dist' }))

// ── Wizard redirect for non-API page requests ─────────────────
// If no users exist (first-run), redirect to /wizard so the SPA
// can show the setup page.  API routes are unaffected.
app.get('*', async (c, next) => {
  const path = c.req.path
  // Skip API routes and the wizard page itself
  if (path.startsWith('/api/') || path === '/wizard') {
    return next()
  }
  const setupDone = await checkSetupComplete()
  if (!setupDone) {
    return c.redirect('/wizard', 302)
  }
  return next()
})

// ── SPA catch-all ─────────────────────────────────────────────
// Any non-API route that didn't match a static file → serve index.html
// so client-side routing works (React Router).
app.get('*', serveStatic({ path: './apps/web/dist/index.html' }))

// 404 handler (for API routes that didn't match)
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
