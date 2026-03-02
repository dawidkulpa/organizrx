import { Hono } from 'hono'
import { initConfig } from './config'

const { env } = await initConfig()

const app = new Hono()

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', version: '0.0.1' })
})

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404)
})

export default {
  port: env.PORT,
  hostname: env.HOST,
  fetch: app.fetch,
}
