import { Hono } from 'hono'
import { loginRequestSchema } from '@organizrx/shared'
import { getCookie } from 'hono/cookie'
import {
  findUserByUsername,
  findUserById,
  verifyPassword,
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  storeRefreshToken,
  revokeRefreshToken,
  isRefreshTokenValid,
  checkLockout,
  recordFailedAttempt,
  clearFailedAttempts,
  toAuthUser,
} from '../services/auth'
import { createTempToken, getUserTotpData } from '../services/auth-2fa'
import { appendSsoCookies, appendClearSsoCookies } from '../services/sso'
import { authMiddleware } from '../middleware/auth'
import { getConfig } from '../config'
import { buildRefreshCookie, buildClearRefreshCookie } from '../services/refresh-cookie'

const auth = new Hono()

// POST /api/auth/login
auth.post('/login', async (c) => {
  const body = await c.req.json()
  const parsed = loginRequestSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
    }, 400)
  }

  const { username, password, rememberMe } = parsed.data

  const lockout = checkLockout(username)
  if (lockout.locked) {
    const seconds = Math.ceil(lockout.remainingMs / 1000)
    return c.json({
      error: { code: 'ACCOUNT_LOCKED', message: `Account locked. Try again in ${seconds} seconds.` },
    }, 429)
  }

  const user = await findUserByUsername(username)

  if (!user || !user.password) {
    recordFailedAttempt(username)
    return c.json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' },
    }, 401)
  }

  if (user.locked === 1) {
    return c.json({
      error: { code: 'ACCOUNT_DISABLED', message: 'Account is disabled' },
    }, 403)
  }

  const valid = await verifyPassword(password, user.password)

  if (!valid) {
    recordFailedAttempt(username)
    return c.json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' },
    }, 401)
  }

  clearFailedAttempts(username)

  // Check if user has 2FA enabled
  const totpData = await getUserTotpData(user.id)
  if (totpData?.totp_enabled === 1) {
    const tempToken = await createTempToken(user.id)
    return c.json({
      data: {
        requires_2fa: true,
        temp_token: tempToken,
      },
    })
  }

  const authUser = toAuthUser(user)
  const accessToken = await createAccessToken(authUser)
  const refreshToken = await createRefreshToken(user.id, rememberMe)

  const { auth: authConfig } = getConfig()
  const days = rememberMe ? authConfig.rememberMeDays : authConfig.refreshTokenExpiryDays
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  await storeRefreshToken({
    userId: user.id,
    token: refreshToken,
    browser: c.req.header('User-Agent') ?? null,
    ip: c.req.header('X-Forwarded-For') ?? c.req.header('X-Real-IP') ?? null,
    expiresAt,
  })

  const response = c.json({
    data: {
      accessToken,
      user: authUser,
    },
  })

  // Set refresh token as httpOnly cookie
  response.headers.append('Set-Cookie', buildRefreshCookie(refreshToken, days))

  // Set SSO cookies for downstream services
  await appendSsoCookies(user.id, response.headers)

  return response
})

// POST /api/auth/refresh
auth.post('/refresh', async (c) => {
  const oldToken = getCookie(c, 'organizrx_refresh')

  if (!oldToken) {
    return c.json({
      error: { code: 'MISSING_TOKEN', message: 'No refresh token cookie' },
    }, 401)
  }

  try {
    const payload = await verifyRefreshToken(oldToken)

    const stillValid = await isRefreshTokenValid(oldToken)
    if (!stillValid) {
      return c.json({
        error: { code: 'TOKEN_REVOKED', message: 'Refresh token has been revoked' },
      }, 401)
    }

    // Rotate: revoke old, issue new pair
    await revokeRefreshToken(oldToken)

    const user = await findUserById(payload.userId)
    if (!user) {
      return c.json({
        error: { code: 'USER_NOT_FOUND', message: 'User no longer exists' },
      }, 401)
    }

    const accessToken = await createAccessToken(user)
    const newRefreshToken = await createRefreshToken(user.id)

    const { auth: authConfig } = getConfig()
    const days = authConfig.refreshTokenExpiryDays
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

    await storeRefreshToken({
      userId: user.id,
      token: newRefreshToken,
      browser: c.req.header('User-Agent') ?? null,
      ip: c.req.header('X-Forwarded-For') ?? c.req.header('X-Real-IP') ?? null,
      expiresAt,
    })

    const response = c.json({
      data: {
        accessToken,
      },
    })

    // Rotate the cookie
    response.headers.append('Set-Cookie', buildRefreshCookie(newRefreshToken, days))

    return response
  } catch {
    return c.json({
      error: { code: 'INVALID_TOKEN', message: 'Refresh token is invalid or expired' },
    }, 401)
  }
})

// POST /api/auth/logout
auth.post('/logout', async (c) => {
  const oldToken = getCookie(c, 'organizrx_refresh')

  if (oldToken) {
    await revokeRefreshToken(oldToken)
  }

  const response = c.json({ data: { success: true } })

  // Clear refresh token cookie
  response.headers.append('Set-Cookie', buildClearRefreshCookie())

  // Clear SSO cookies for downstream services
  await appendClearSsoCookies(response.headers)

  return response
})

// GET /api/auth/me — requires valid access token
auth.get('/me', authMiddleware(), async (c) => {
  const tokenUser = c.get('user')
  const user = await findUserById(tokenUser.userID)

  if (!user) {
    return c.json({
      error: { code: 'USER_NOT_FOUND', message: 'User no longer exists' },
    }, 401)
  }

  return c.json({ data: { user } })
})

export default auth
