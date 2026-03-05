import { getSsoConfig } from './config'
import { getUserToken } from './tokens'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SsoCookie {
  name: string
  value: string
  domain: string
  path: string
  httpOnly: boolean
  secure: boolean
  sameSite: 'Lax'
  maxAge: number
}

// ---------------------------------------------------------------------------
// Cookie generation
// ---------------------------------------------------------------------------

export async function getSsoCookies(userId: number): Promise<SsoCookie[]> {
  const configs = await getSsoConfig()
  const cookies: SsoCookie[] = []

  for (const config of configs) {
    if (!config.enabled) continue

    const token = await getUserToken(userId, config.token_source)
    if (!token) continue

    cookies.push({
      name: config.cookie_name,
      value: token,
      domain: config.cookie_domain,
      path: config.cookie_path,
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    })
  }

  return cookies
}

// ---------------------------------------------------------------------------
// Set-Cookie header builders
// ---------------------------------------------------------------------------

export function buildSetCookieHeaders(cookies: SsoCookie[]): string[] {
  return cookies.map((cookie) => {
    const parts = [
      `${cookie.name}=${encodeURIComponent(cookie.value)}`,
      `Path=${cookie.path}`,
      `Max-Age=${cookie.maxAge}`,
      `SameSite=${cookie.sameSite}`,
    ]

    if (cookie.domain) {
      parts.push(`Domain=${cookie.domain}`)
    }

    if (cookie.httpOnly) {
      parts.push('HttpOnly')
    }

    if (cookie.secure) {
      parts.push('Secure')
    }

    return parts.join('; ')
  })
}

export async function buildClearCookieHeaders(): Promise<string[]> {
  const configs = await getSsoConfig()
  const headers: string[] = []

  for (const config of configs) {
    if (!config.enabled) continue

    const parts = [`${config.cookie_name}=`, `Path=${config.cookie_path}`, 'Max-Age=0']

    if (config.cookie_domain) {
      parts.push(`Domain=${config.cookie_domain}`)
    }

    headers.push(parts.join('; '))
  }

  return headers
}

// ---------------------------------------------------------------------------
// Response helpers (for integration with login/logout)
// ---------------------------------------------------------------------------

export async function appendSsoCookies(userId: number, headers: Headers): Promise<void> {
  const cookies = await getSsoCookies(userId)
  const cookieHeaders = buildSetCookieHeaders(cookies)

  for (const header of cookieHeaders) {
    headers.append('Set-Cookie', header)
  }
}

export async function appendClearSsoCookies(headers: Headers): Promise<void> {
  const cookieHeaders = await buildClearCookieHeaders()

  for (const header of cookieHeaders) {
    headers.append('Set-Cookie', header)
  }
}
