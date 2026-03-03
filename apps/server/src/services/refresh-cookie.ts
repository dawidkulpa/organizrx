import { getConfig } from '../config'

// ---------------------------------------------------------------------------
// Refresh Token Cookie Helpers
// ---------------------------------------------------------------------------

const COOKIE_NAME = 'organizrx_refresh'
const COOKIE_PATH = '/api/auth'

/**
 * Build a Set-Cookie header value for the refresh token.
 * Uses httpOnly + SameSite=Lax to prevent XSS and CSRF.
 */
export function buildRefreshCookie(token: string, days: number): string {
  const maxAge = days * 24 * 60 * 60 // seconds
  const isProduction = process.env.NODE_ENV === 'production'

  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    `Path=${COOKIE_PATH}`,
    `Max-Age=${maxAge}`,
    'SameSite=Lax',
    'HttpOnly',
  ]

  if (isProduction) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

/**
 * Build a Set-Cookie header that clears (expires) the refresh token cookie.
 */
export function buildClearRefreshCookie(): string {
  const parts = [`${COOKIE_NAME}=`, `Path=${COOKIE_PATH}`, 'Max-Age=0', 'SameSite=Lax', 'HttpOnly']

  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure')
  }

  return parts.join('; ')
}

/**
 * Calculate the number of days for refresh token cookie Max-Age,
 * based on config and rememberMe flag.
 */
export function getRefreshCookieDays(rememberMe?: boolean): number {
  const { auth } = getConfig()
  return rememberMe ? auth.rememberMeDays : auth.refreshTokenExpiryDays
}
