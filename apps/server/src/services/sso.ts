import { eq } from 'drizzle-orm'

import { getRawDb, getDialect, type SqliteDb, type MysqlDb, type PostgresDb } from '../db'
import * as sqliteSchema from '../db/schema/sqlite'
import * as mysqlSchema from '../db/schema/mysql'
import * as pgSchema from '../db/schema/pg'
import { getSettingString, getSettingBoolean } from './settings'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SsoServiceConfig {
  name: string
  enabled: boolean
  cookie_name: string
  cookie_domain: string
  cookie_path: string
  token_source: string
  description?: string
}

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
// Default SSO service configs
// ---------------------------------------------------------------------------

export const DEFAULT_SSO_SERVICES: Omit<SsoServiceConfig, 'enabled'>[] = [
  {
    name: 'plex',
    cookie_name: 'X-Plex-Token',
    cookie_domain: '',
    cookie_path: '/',
    token_source: 'plex_token',
    description: 'Plex Media Server',
  },
  {
    name: 'jellyfin',
    cookie_name: 'jellyfin_credentials',
    cookie_domain: '',
    cookie_path: '/',
    token_source: 'jellyfin_token',
    description: 'Jellyfin Media Server',
  },
  {
    name: 'emby',
    cookie_name: 'emby_token',
    cookie_domain: '',
    cookie_path: '/',
    token_source: 'emby_token',
    description: 'Emby Media Server',
  },
  {
    name: 'tautulli',
    cookie_name: 'tautulli_token',
    cookie_domain: '',
    cookie_path: '/',
    token_source: 'tautulli_token',
    description: 'Tautulli Statistics Tracker',
  },
  {
    name: 'overseerr',
    cookie_name: 'connect.sid',
    cookie_domain: '',
    cookie_path: '/',
    token_source: 'overseerr_token',
    description: 'Overseerr Request Manager',
  },
  {
    name: 'ombi',
    cookie_name: 'Auth',
    cookie_domain: '',
    cookie_path: '/',
    token_source: 'ombi_token',
    description: 'Ombi Request Manager',
  },
  {
    name: 'petio',
    cookie_name: 'petio_jwt',
    cookie_domain: '',
    cookie_path: '/',
    token_source: 'petio_token',
    description: 'Petio Request Manager',
  },
  {
    name: 'komga',
    cookie_name: 'komga_token',
    cookie_domain: '',
    cookie_path: '/',
    token_source: 'komga_token',
    description: 'Komga Comic/Manga Server',
  },
]

// ---------------------------------------------------------------------------
// Dialect helper
// ---------------------------------------------------------------------------

type DialectResult =
  | { db: SqliteDb; users: typeof sqliteSchema.users; dialect: 'sqlite' }
  | { db: MysqlDb; users: typeof mysqlSchema.users; dialect: 'mysql' }
  | { db: PostgresDb; users: typeof pgSchema.users; dialect: 'postgresql' }

function dialectCtx(): DialectResult {
  const dialect = getDialect()
  const raw = getRawDb()
  switch (dialect) {
    case 'sqlite':
      return { db: raw as SqliteDb, users: sqliteSchema.users, dialect }
    case 'mysql':
      return { db: raw as MysqlDb, users: mysqlSchema.users, dialect }
    case 'postgresql':
      return { db: raw as PostgresDb, users: pgSchema.users, dialect }
    default:
      throw new Error(`Unsupported dialect: ${dialect}`)
  }
}

// ---------------------------------------------------------------------------
// SSO configuration
// ---------------------------------------------------------------------------

export async function getSsoConfig(): Promise<SsoServiceConfig[]> {
  const globalEnabled = await getSettingBoolean('sso_enabled', false)

  const configs: SsoServiceConfig[] = []
  for (const service of DEFAULT_SSO_SERVICES) {
    const enabled = globalEnabled && await getSettingBoolean(`sso_${service.name}_enabled`, false)
    const cookie_name = await getSettingString(`sso_${service.name}_cookie_name`, service.cookie_name)
    const cookie_domain = await getSettingString(`sso_${service.name}_cookie_domain`, service.cookie_domain)
    const cookie_path = await getSettingString(`sso_${service.name}_cookie_path`, service.cookie_path)
    const token_source = await getSettingString(`sso_${service.name}_token_source`, service.token_source)

    configs.push({
      name: service.name,
      enabled,
      cookie_name,
      cookie_domain,
      cookie_path,
      token_source,
      description: service.description,
    })
  }

  return configs
}

// ---------------------------------------------------------------------------
// Token retrieval
// ---------------------------------------------------------------------------

async function getUserToken(userId: number, tokenSource: string): Promise<string | null> {
  const ctx = dialectCtx()

  // Special case: plex_token is stored in user record
  if (tokenSource === 'plex_token') {
    let rows: unknown[]

    if (ctx.dialect === 'sqlite') {
      rows = ctx.db
        .select({ plex_token: ctx.users.plex_token })
        .from(ctx.users)
        .where(eq(ctx.users.id, userId))
        .all()
    } else if (ctx.dialect === 'mysql') {
      rows = await ctx.db
        .select({ plex_token: ctx.users.plex_token })
        .from(ctx.users)
        .where(eq(ctx.users.id, userId))
    } else {
      rows = await ctx.db
        .select({ plex_token: ctx.users.plex_token })
        .from(ctx.users)
        .where(eq(ctx.users.id, userId))
    }

    if (rows.length === 0) return null
    const row = rows[0] as { plex_token: string | null }
    return row.plex_token
  }

  // For other services, tokens are stored in settings table
  // Format: sso_{service}_token or user-specific: sso_{service}_token_{userId}
  const userSpecificKey = `sso_${tokenSource.replace('_token', '')}_token_${userId}`
  const globalKey = `sso_${tokenSource.replace('_token', '')}_token`

  // Try user-specific token first, then fall back to global token
  const userToken = await getSettingString(userSpecificKey, '')
  if (userToken) return userToken

  const globalToken = await getSettingString(globalKey, '')
  return globalToken || null
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

    const parts = [
      `${config.cookie_name}=`,
      `Path=${config.cookie_path}`,
      'Max-Age=0',
    ]

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
