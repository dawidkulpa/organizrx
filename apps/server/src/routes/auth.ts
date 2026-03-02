import { Hono } from 'hono'
import { loginRequestSchema, refreshTokenRequestSchema, logoutRequestSchema } from '@organizrx/shared'
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
import { authMiddleware } from '../middleware/auth'
import { getConfig } from '../config'

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

  return c.json({
    data: {
      accessToken,
      refreshToken,
      user: authUser,
    },
  })
})

// POST /api/auth/refresh
auth.post('/refresh', async (c) => {
  const body = await c.req.json()
  const parsed = refreshTokenRequestSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
    }, 400)
  }

  const { refreshToken: oldToken } = parsed.data

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
    const expiresAt = new Date(Date.now() + authConfig.refreshTokenExpiryDays * 24 * 60 * 60 * 1000)

    await storeRefreshToken({
      userId: user.id,
      token: newRefreshToken,
      browser: c.req.header('User-Agent') ?? null,
      ip: c.req.header('X-Forwarded-For') ?? c.req.header('X-Real-IP') ?? null,
      expiresAt,
    })

    return c.json({
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    })
  } catch {
    return c.json({
      error: { code: 'INVALID_TOKEN', message: 'Refresh token is invalid or expired' },
    }, 401)
  }
})

// POST /api/auth/logout
auth.post('/logout', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const parsed = logoutRequestSchema.safeParse(body)

  if (parsed.success && parsed.data.refreshToken) {
    await revokeRefreshToken(parsed.data.refreshToken)
  }

  return c.json({ data: { success: true } })
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
