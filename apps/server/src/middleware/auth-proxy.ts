import type { Context, Next } from 'hono'
import { authenticateProxyUser } from '../services/auth-proxy'
import type { AccessTokenPayload } from '../services/auth'
import { verifyAccessToken } from '../services/auth'

type AuthVariables = {
  user: AccessTokenPayload
}

// Extract client IP from request (prioritizes X-Real-IP, then X-Forwarded-For, then connection remote address)
function getClientIp(c: Context): string {
  // X-Real-IP (single IP)
  const realIp = c.req.header('X-Real-IP')
  if (realIp) return realIp

  // X-Forwarded-For (comma-separated list, leftmost is client)
  const forwardedFor = c.req.header('X-Forwarded-For')
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map((ip) => ip.trim())
    return ips[0]
  }

  // Fallback to connection remote address (not available in Hono, so use fallback)
  return '127.0.0.1'
}

// Hono middleware: intercept proxy auth headers and authenticate if valid
export function authProxyMiddleware() {
  return async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
    const clientIp = getClientIp(c)

    // Convert headers to lowercase-keyed object for case-insensitive lookup
    const headers: Record<string, string> = {}
    c.req.raw.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value
    })

    // Try proxy authentication
    let result: { token: string } | null = null
    try {
      result = await authenticateProxyUser(clientIp, headers)
    } catch {
      // DB not ready (first-run, tables missing) — skip proxy auth
      return next()
    }

    if (result) {
      // Proxy auth succeeded, verify token and set user on context
      try {
        const payload = await verifyAccessToken(result.token)
        c.set('user', payload)
        // Continue to next handler (skip normal auth)
        return next()
      } catch {
        // Token invalid, fall through to normal auth
      }
    }

    // Proxy auth not applicable or failed, pass through to next middleware (normal auth)
    return next()
  }
}
