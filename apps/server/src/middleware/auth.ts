import type { Context, Next } from 'hono'
import { verifyAccessToken, type AccessTokenPayload } from '../services/auth'

export type AuthVariables = {
  user: AccessTokenPayload
}

// Hono middleware: extract Bearer token, verify JWT, set c.set('user', payload)
export function authMiddleware() {
  return async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
    const header = c.req.header('Authorization')

    if (!header || !header.startsWith('Bearer ')) {
      return c.json(
        { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } },
        401
      )
    }

    const token = header.slice(7)

    try {
      const payload = await verifyAccessToken(token)
      c.set('user', payload)
      return next()
    } catch {
      return c.json(
        { error: { code: 'TOKEN_EXPIRED', message: 'Access token is invalid or expired' } },
        401
      )
    }
  }
}

// Authorization middleware: require user's groupID <= maxGroupId (lower = more privileged)
// Admin=0, Co-Admin=1, Super User=2, Power User=3, User=4, Guest=999
export function requireGroup(maxGroupId: number) {
  return async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
    const user = c.get('user')

    if (!user) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401)
    }

    if (user.groupID === null || user.groupID > maxGroupId) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 403)
    }

    return next()
  }
}
