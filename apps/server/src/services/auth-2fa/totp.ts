import * as OTPAuth from 'otpauth'

// ---------------------------------------------------------------------------
// TOTP generation and verification
// ---------------------------------------------------------------------------

export function generateTotpSecret(username: string): { secret: string; qrUri: string } {
  const secret = new OTPAuth.Secret({ size: 20 })
  const totp = new OTPAuth.TOTP({
    issuer: 'OrganizrX',
    label: username,
    secret,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  })

  return {
    secret: secret.base32,
    qrUri: totp.toString(),
  }
}

export function verifyTotpCode(secret: string, token: string): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(secret),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    })

    const delta = totp.validate({ token, window: 1 })
    return delta !== null
  } catch {
    return false
  }
}
