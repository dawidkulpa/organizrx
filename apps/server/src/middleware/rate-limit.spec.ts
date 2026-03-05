import { describe, it, expect, beforeAll } from 'bun:test'
import { Hono } from 'hono'
import { rateLimiter } from 'hono-rate-limiter'

describe('rate-limit middleware', () => {
  let app: Hono

  beforeAll(() => {
    app = new Hono()

    app.use(
      '/api/auth/*',
      rateLimiter({
        windowMs: 60_000,
        limit: 3,
        keyGenerator: (c) =>
          c.req.header('X-Real-IP') ??
          c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ??
          'anonymous',
        standardHeaders: 'draft-7',
        handler: (c) => {
          return c.json(
            {
              error: {
                code: 'RATE_LIMITED',
                message: 'Too many requests. Please try again later.',
              },
            },
            429
          )
        },
      })
    )

    app.post('/api/auth/login', (c) => c.json({ data: { ok: true } }))
    app.get('/api/health', (c) => c.json({ status: 'ok' }))
  })

  it('should allow requests under the limit', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'X-Real-IP': '10.0.0.1' },
    })
    expect(res.status).toBe(200)
  })

  it('should block requests over the limit with 429', async () => {
    // Use a fresh IP to not collide with previous test
    for (let i = 0; i < 3; i++) {
      await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'X-Real-IP': '10.0.0.2' },
      })
    }

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'X-Real-IP': '10.0.0.2' },
    })
    expect(res.status).toBe(429)

    const json = await res.json()
    expect(json.error.code).toBe('RATE_LIMITED')
  })

  it('should not rate limit non-auth routes', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await app.request('/api/health', {
        headers: { 'X-Real-IP': '10.0.0.3' },
      })
      expect(res.status).toBe(200)
    }
  })

  it('should use different keys per IP', async () => {
    // Exhaust limit for 10.0.0.4
    for (let i = 0; i < 3; i++) {
      await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'X-Real-IP': '10.0.0.4' },
      })
    }

    // 10.0.0.5 should still be allowed
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'X-Real-IP': '10.0.0.5' },
    })
    expect(res.status).toBe(200)
  })

  it('should return standard rate limit headers', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'X-Real-IP': '10.0.0.6' },
    })
    // draft-7 uses RateLimit header
    const rateLimitHeader = res.headers.get('RateLimit')
    expect(rateLimitHeader).toBeTruthy()
  })
})
