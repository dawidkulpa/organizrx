import { Hono } from 'hono'
import { z } from 'zod'

import {
  getOidcConfig,
  discoverOidcProvider,
  buildOidcAuthUrl,
  exchangeOidcCode,
  extractOidcUserInfo,
  mapOidcGroupsToOrganizr,
  findOrCreateOidcUser,
  linkOidcAccount,
  storeOidcState,
  retrieveAndDeleteOidcState,
  getGroupNameById,
} from '../services/auth-oidc'
import { createAccessToken, createRefreshToken, storeRefreshToken } from '../services/auth'
import { authMiddleware } from '../middleware/auth'
import { getConfig } from '../config'
import { buildRefreshCookie } from '../services/refresh-cookie'

const oidcLinkSchema = z.object({
  oidcSub: z.string().min(1, 'OIDC subject identifier is required'),
})

const oidc = new Hono()

// ---------------------------------------------------------------------------
// GET /oidc — Initiate OIDC authorization flow
// ---------------------------------------------------------------------------

oidc.get('/oidc', async (c) => {
  const oidcConfig = await getOidcConfig()

  if (!oidcConfig.enabled) {
    return c.json(
      {
        error: { code: 'OIDC_DISABLED', message: 'OIDC authentication is not enabled' },
      },
      403
    )
  }

  if (!oidcConfig.providerUrl || !oidcConfig.clientId) {
    return c.json(
      {
        error: {
          code: 'OIDC_NOT_CONFIGURED',
          message: 'OIDC provider URL or client ID not configured',
        },
      },
      500
    )
  }

  try {
    const providerConfig = await discoverOidcProvider(
      oidcConfig.providerUrl,
      oidcConfig.clientId,
      oidcConfig.clientSecret
    )

    const result = await buildOidcAuthUrl(providerConfig, oidcConfig.redirectUri, oidcConfig.scopes)

    // Store PKCE state for callback verification
    storeOidcState(result.state, {
      codeVerifier: result.codeVerifier,
      state: result.state,
      nonce: result.nonce,
      createdAt: Date.now(),
    })

    return c.json({
      data: {
        redirectUrl: result.url,
        state: result.state,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to initiate OIDC flow'
    return c.json(
      {
        error: { code: 'OIDC_DISCOVERY_FAILED', message },
      },
      500
    )
  }
})

// ---------------------------------------------------------------------------
// GET /oidc/callback — Handle OIDC provider callback
// ---------------------------------------------------------------------------

oidc.get('/oidc/callback', async (c) => {
  const oidcConfig = await getOidcConfig()

  if (!oidcConfig.enabled) {
    return c.json(
      {
        error: { code: 'OIDC_DISABLED', message: 'OIDC authentication is not enabled' },
      },
      403
    )
  }

  // Check for error from provider
  const errorParam = c.req.query('error')
  if (errorParam) {
    const errorDescription = c.req.query('error_description') ?? 'Unknown error from OIDC provider'
    return c.json(
      {
        error: { code: 'OIDC_PROVIDER_ERROR', message: errorDescription },
      },
      400
    )
  }

  const code = c.req.query('code')
  const state = c.req.query('state')

  if (!code || !state) {
    return c.json(
      {
        error: { code: 'OIDC_MISSING_PARAMS', message: 'Missing code or state parameter' },
      },
      400
    )
  }

  // Retrieve and validate state
  const storedState = retrieveAndDeleteOidcState(state)
  if (!storedState) {
    return c.json(
      {
        error: { code: 'OIDC_INVALID_STATE', message: 'Invalid or expired state parameter' },
      },
      400
    )
  }

  try {
    const providerConfig = await discoverOidcProvider(
      oidcConfig.providerUrl,
      oidcConfig.clientId,
      oidcConfig.clientSecret
    )

    // Build the full callback URL for token exchange
    const callbackUrl = new URL(c.req.url)

    const tokenResult = await exchangeOidcCode(
      providerConfig,
      callbackUrl,
      storedState.codeVerifier,
      storedState.state,
      storedState.nonce
    )

    // Extract user info from ID token claims
    const oidcUserInfo = extractOidcUserInfo(tokenResult.claims, oidcConfig.groupClaim)

    if (!oidcUserInfo.sub) {
      return c.json(
        {
          error: { code: 'OIDC_NO_SUBJECT', message: 'No subject identifier in OIDC claims' },
        },
        400
      )
    }

    // Map OIDC groups to OrganizrX group_id
    const groupId = mapOidcGroupsToOrganizr(
      tokenResult.claims,
      oidcConfig.groupClaim,
      oidcConfig.groupMapping,
      oidcConfig.defaultGroupId
    )

    const groupName = getGroupNameById(groupId)

    // Find or create user
    const user = await findOrCreateOidcUser(
      oidcUserInfo,
      groupId,
      groupName,
      oidcConfig.autoCreateUser
    )

    if (!user) {
      return c.json(
        {
          error: {
            code: 'OIDC_USER_DENIED',
            message: 'User not found and auto-creation is disabled',
          },
        },
        403
      )
    }

    // Issue JWT tokens
    const accessToken = await createAccessToken(user)
    const refreshToken = await createRefreshToken(user.id)

    const { auth: authConfig } = getConfig()
    const expiresAt = new Date(Date.now() + authConfig.refreshTokenExpiryDays * 24 * 60 * 60 * 1000)

    await storeRefreshToken({
      userId: user.id,
      token: refreshToken,
      browser: c.req.header('User-Agent') ?? null,
      ip: c.req.header('X-Forwarded-For') ?? c.req.header('X-Real-IP') ?? null,
      expiresAt,
    })

    const days = authConfig.refreshTokenExpiryDays

    const response = c.json({
      data: {
        accessToken,
        user,
      },
    })

    // Set refresh token as httpOnly cookie
    response.headers.append('Set-Cookie', buildRefreshCookie(refreshToken, days))

    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OIDC authentication failed'
    return c.json(
      {
        error: { code: 'OIDC_AUTH_FAILED', message },
      },
      500
    )
  }
})

// ---------------------------------------------------------------------------
// POST /oidc/link — Link authenticated user to OIDC identity
// ---------------------------------------------------------------------------

oidc.post('/oidc/link', authMiddleware(), async (c) => {
  const body = await c.req.json()
  const parsed = oidcLinkSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
      },
      400
    )
  }

  const tokenUser = c.get('user')

  try {
    await linkOidcAccount(tokenUser.userID, parsed.data.oidcSub)

    return c.json({
      data: { success: true, message: 'OIDC account linked successfully' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to link OIDC account'
    return c.json(
      {
        error: { code: 'OIDC_LINK_FAILED', message },
      },
      500
    )
  }
})

export default oidc
