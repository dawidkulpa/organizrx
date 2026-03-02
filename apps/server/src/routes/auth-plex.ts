import { Hono } from 'hono'
import { z } from 'zod'
import {
  initiatePlexAuth,
  pollPlexAuth,
  verifyPlexToken,
  checkPlexServerAccess,
  findOrCreatePlexUser,
  linkPlexAccount,
  isPlexAuthEnabled,
  getPlexServerId,
  isPlexAdminOnly,
  getPlexDefaultGroupId,
} from '../services/auth-plex'
import { createAccessToken, createRefreshToken, storeRefreshToken } from '../services/auth'
import { authMiddleware } from '../middleware/auth'
import { getConfig } from '../config'

const plexAuth = new Hono()

// ---------------------------------------------------------------------------
// Validation Schemas
// ---------------------------------------------------------------------------

const plexCallbackSchema = z.object({
  pin_id: z.string().transform((val) => Number(val)),
})

const plexLinkSchema = z.object({
  auth_token: z.string().min(1),
})

// ---------------------------------------------------------------------------
// GET /api/auth/plex — Initiate Plex OAuth
// ---------------------------------------------------------------------------

plexAuth.get('/plex', async (c) => {
  const enabled = await isPlexAuthEnabled()
  if (!enabled) {
    return c.json({
      error: { code: 'PLEX_DISABLED', message: 'Plex authentication is not enabled' },
    }, 403)
  }

  try {
    const { pinId, code, authUrl } = await initiatePlexAuth()

    return c.json({
      data: {
        pin_id: pinId,
        code,
        auth_url: authUrl,
      },
    })
  } catch (err) {
    return c.json({
      error: { code: 'PLEX_ERROR', message: err instanceof Error ? err.message : 'Failed to initiate Plex auth' },
    }, 500)
  }
})

// ---------------------------------------------------------------------------
// GET /api/auth/plex/callback — Poll for completed auth
// ---------------------------------------------------------------------------

plexAuth.get('/plex/callback', async (c) => {
  const enabled = await isPlexAuthEnabled()
  if (!enabled) {
    return c.json({
      error: { code: 'PLEX_DISABLED', message: 'Plex authentication is not enabled' },
    }, 403)
  }

  const query = c.req.query()
  const parsed = plexCallbackSchema.safeParse(query)

  if (!parsed.success) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
    }, 400)
  }

  const { pin_id } = parsed.data

  try {
    const authToken = await pollPlexAuth(pin_id)

    if (!authToken) {
      return c.json({
        error: { code: 'AUTH_PENDING', message: 'User has not completed Plex authentication yet' },
      }, 202)
    }

    // Verify the token and get user info
    const plexUser = await verifyPlexToken(authToken)

    // Check server access if required
    const adminOnly = await isPlexAdminOnly()
    const serverId = await getPlexServerId()

    if (adminOnly && serverId) {
      const hasAccess = await checkPlexServerAccess(authToken, serverId)
      if (!hasAccess) {
        return c.json({
          error: { code: 'ACCESS_DENIED', message: 'You do not have access to the configured Plex server' },
        }, 403)
      }
    }

    // Find or create user
    const defaultGroupId = await getPlexDefaultGroupId()
    const user = await findOrCreatePlexUser(plexUser, authToken, defaultGroupId)

    // Issue JWT tokens
    const accessToken = await createAccessToken(user)
    const refreshToken = await createRefreshToken(user.id, false)

    const { auth: authConfig } = getConfig()
    const expiresAt = new Date(Date.now() + authConfig.refreshTokenExpiryDays * 24 * 60 * 60 * 1000)

    await storeRefreshToken({
      userId: user.id,
      token: refreshToken,
      browser: c.req.header('User-Agent') ?? null,
      ip: c.req.header('X-Forwarded-For') ?? c.req.header('X-Real-IP') ?? null,
      expiresAt,
    })

    return c.json({
      data: {
        accessToken,
        refreshToken,
        user,
      },
    })
  } catch (err) {
    return c.json({
      error: { code: 'PLEX_ERROR', message: err instanceof Error ? err.message : 'Failed to complete Plex auth' },
    }, 500)
  }
})

// ---------------------------------------------------------------------------
// POST /api/auth/plex/link — Link existing user to Plex account
// ---------------------------------------------------------------------------

plexAuth.post('/plex/link', authMiddleware(), async (c) => {
  const enabled = await isPlexAuthEnabled()
  if (!enabled) {
    return c.json({
      error: { code: 'PLEX_DISABLED', message: 'Plex authentication is not enabled' },
    }, 403)
  }

  const body = await c.req.json()
  const parsed = plexLinkSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
    }, 400)
  }

  const { auth_token } = parsed.data
  const tokenUser = c.get('user')

  try {
    // Check server access if required
    const adminOnly = await isPlexAdminOnly()
    const serverId = await getPlexServerId()

    if (adminOnly && serverId) {
      const hasAccess = await checkPlexServerAccess(auth_token, serverId)
      if (!hasAccess) {
        return c.json({
          error: { code: 'ACCESS_DENIED', message: 'You do not have access to the configured Plex server' },
        }, 403)
      }
    }

    // Link the account
    await linkPlexAccount(tokenUser.userID, auth_token)

    return c.json({
      data: {
        success: true,
        message: 'Plex account linked successfully',
      },
    })
  } catch (err) {
    return c.json({
      error: { code: 'PLEX_ERROR', message: err instanceof Error ? err.message : 'Failed to link Plex account' },
    }, 500)
  }
})

export default plexAuth
