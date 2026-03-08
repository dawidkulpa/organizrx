import { rateLimiter } from 'hono-rate-limiter'
import { getConfig } from '../config'

/**
 * HTTP rate limiting middleware for auth endpoints.
 * Consumes `security.rateLimitWindowMs` and `security.rateLimitMaxRequests`
 * from the application config.
 *
 * Uses the client IP (X-Forwarded-For or X-Real-IP) as the rate limit key.
 * Returns a JSON error matching the project's standard error envelope.
 */
export function authRateLimiter() {
  const { security } = getConfig()

  return rateLimiter({
    windowMs: security.rateLimitWindowMs,
    limit: security.rateLimitMaxRequests,
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
}

export function tabUrlCheckRateLimiter() {
  let limiter: ReturnType<typeof rateLimiter> | null = null

  return async (c: any, next: any) => {
    if (!limiter) {
      const { security } = getConfig()
      limiter = rateLimiter({
        windowMs: security.rateLimitWindowMs,
        limit: security.rateLimitMaxRequests,
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
                message: 'Too many URL check requests. Please try again later.',
              },
            },
            429
          )
        },
      })
    }
    return limiter(c, next)
  }
}
