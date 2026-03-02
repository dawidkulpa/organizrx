import { Hono } from 'hono'
import {
  setupTwoFactorRequestSchema,
  verifySetupTwoFactorRequestSchema,
  verifyTwoFactorRequestSchema,
  disableTwoFactorRequestSchema,
} from '@organizrx/shared'
import {
  generateTotpSecret,
  verifyTotpCode,
  encryptSecret,
  decryptSecret,
  generateBackupCodes,
  verifyBackupCode,
  enableTwoFactor,
  disableTwoFactor,
  updateBackupCodes,
  getUserTotpData,
  verifyTempToken,
} from '../services/auth-2fa'
import {
  findUserById,
  verifyPassword,
  createAccessToken,
  createRefreshToken,
  storeRefreshToken,
  toAuthUser,
} from '../services/auth'
import { authMiddleware } from '../middleware/auth'
import { getConfig } from '../config'

const auth2fa = new Hono()

// POST /api/auth/2fa/setup — Initiate 2FA setup
auth2fa.post('/setup', authMiddleware(), async (c) => {
  const body = await c.req.json()
  const parsed = setupTwoFactorRequestSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
      },
      400
    )
  }

  const tokenUser = c.get('user')
  const userId = tokenUser.userID

  const totpData = await getUserTotpData(userId)

  if (totpData?.totp_enabled === 1) {
    return c.json(
      {
        error: { code: 'TWO_FACTOR_ALREADY_ENABLED', message: '2FA is already enabled' },
      },
      400
    )
  }

  const user = await findUserById(userId)
  if (!user) {
    return c.json(
      {
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      },
      404
    )
  }

  const { secret, qrUri } = generateTotpSecret(user.username)

  const { plain: backupCodes } = await generateBackupCodes()

  return c.json({
    data: {
      secret,
      qrUri,
      backupCodes,
    },
  })
})

// POST /api/auth/2fa/verify-setup — Verify TOTP code and enable 2FA
auth2fa.post('/verify-setup', authMiddleware(), async (c) => {
  const body = await c.req.json()
  const parsed = verifySetupTwoFactorRequestSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
      },
      400
    )
  }

  const { secret, token } = parsed.data
  const tokenUser = c.get('user')
  const userId = tokenUser.userID

  const isValid = verifyTotpCode(secret, token)

  if (!isValid) {
    return c.json(
      {
        error: { code: 'INVALID_TOTP_CODE', message: 'Invalid TOTP code' },
      },
      401
    )
  }

  const encryptedSecret = encryptSecret(secret)

  const { hashed: hashedBackupCodes } = await generateBackupCodes()

  await enableTwoFactor(userId, encryptedSecret, hashedBackupCodes)

  return c.json({
    data: {
      success: true,
    },
  })
})

// POST /api/auth/2fa/verify — Verify TOTP during login
auth2fa.post('/verify', async (c) => {
  const body = await c.req.json()
  const parsed = verifyTwoFactorRequestSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
      },
      400
    )
  }

  const { temp_token, totp_code, backup_code } = parsed.data

  let payload
  try {
    payload = await verifyTempToken(temp_token)
  } catch {
    return c.json(
      {
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired temporary token' },
      },
      401
    )
  }

  const userId = payload.userId

  const totpData = await getUserTotpData(userId)

  if (!totpData || !totpData.totp_secret || totpData.totp_enabled !== 1) {
    return c.json(
      {
        error: { code: 'TWO_FACTOR_NOT_ENABLED', message: '2FA is not enabled for this user' },
      },
      400
    )
  }

  const plainSecret = decryptSecret(totpData.totp_secret)

  let isValid = false

  if (totp_code) {
    isValid = verifyTotpCode(plainSecret, totp_code)
  } else if (backup_code) {
    const backupCodes = totpData.totp_backup_codes ? JSON.parse(totpData.totp_backup_codes) : []
    const result = await verifyBackupCode(backup_code, backupCodes)
    isValid = result.valid

    if (result.valid) {
      await updateBackupCodes(userId, result.remainingCodes)
    }
  } else {
    return c.json(
      {
        error: { code: 'VALIDATION_ERROR', message: 'Either totp_code or backup_code is required' },
      },
      400
    )
  }

  if (!isValid) {
    return c.json(
      {
        error: { code: 'INVALID_CODE', message: 'Invalid TOTP or backup code' },
      },
      401
    )
  }

  const user = await findUserById(userId)
  if (!user) {
    return c.json(
      {
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      },
      404
    )
  }

  const authUser = toAuthUser(user)
  const accessToken = await createAccessToken(authUser)
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

  return c.json({
    data: {
      accessToken,
      refreshToken,
      user: authUser,
    },
  })
})

// DELETE /api/auth/2fa — Disable 2FA
auth2fa.delete('/', authMiddleware(), async (c) => {
  const body = await c.req.json()
  const parsed = disableTwoFactorRequestSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
      },
      400
    )
  }

  const { password } = parsed.data
  const tokenUser = c.get('user')
  const userId = tokenUser.userID

  const totpData = await getUserTotpData(userId)

  if (!totpData || totpData.totp_enabled !== 1) {
    return c.json(
      {
        error: { code: 'TWO_FACTOR_NOT_ENABLED', message: '2FA is not enabled' },
      },
      400
    )
  }

  const user = await findUserById(userId)
  if (!user) {
    return c.json(
      {
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      },
      404
    )
  }

  const userWithPassword = await import('../services/auth').then((m) =>
    m.findUserByUsername(user.username)
  )

  if (!userWithPassword || !userWithPassword.password) {
    return c.json(
      {
        error: { code: 'INVALID_PASSWORD', message: 'Invalid password' },
      },
      401
    )
  }

  const isPasswordValid = await verifyPassword(password, userWithPassword.password)

  if (!isPasswordValid) {
    return c.json(
      {
        error: { code: 'INVALID_PASSWORD', message: 'Invalid password' },
      },
      401
    )
  }

  await disableTwoFactor(userId)

  return c.json({
    data: {
      success: true,
    },
  })
})

export default auth2fa
