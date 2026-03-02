import { Hono } from 'hono'

const app = new Hono()

const PORT = parseInt(process.env.PORT || '3001')
const HOST = process.env.HOST || '0.0.0.0'

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'ok' })
})

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404)
})

export default {
  port: PORT,
  hostname: HOST,
  fetch: app.fetch,
}
