import { eq } from 'drizzle-orm'
import { getSettingBoolean, getSettingString, getSettingNumber } from './settings'
import { createAccessToken, toAuthUser } from './auth'
import { getRawDb, getDialect, type SqliteDb, type MysqlDb, type PostgresDb } from '../db'
import * as sqliteSchema from '../db/schema/sqlite'
import * as mysqlSchema from '../db/schema/mysql'
import * as pgSchema from '../db/schema/pg'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProxyAuthConfig {
  enabled: boolean
  headerUser: string
  headerEmail: string
  headerGroups: string
  whitelist: string[]
  defaultGroupId: number
  autoCreate: boolean
}

// ---------------------------------------------------------------------------
// Dialect helpers
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
// Proxy Auth Config
// ---------------------------------------------------------------------------

export async function getProxyAuthConfig(): Promise<ProxyAuthConfig> {
  const enabled = await getSettingBoolean('auth_proxy_enabled', false)
  const headerUser = await getSettingString('auth_proxy_header_user', 'X-Forwarded-User')
  const headerEmail = await getSettingString('auth_proxy_header_email', 'X-Forwarded-Email')
  const headerGroups = await getSettingString('auth_proxy_header_groups', 'X-Forwarded-Groups')
  const whitelistStr = await getSettingString('auth_proxy_whitelist', '127.0.0.1,::1')
  const defaultGroupId = await getSettingNumber('auth_proxy_default_group_id', 4)
  const autoCreate = await getSettingBoolean('auth_proxy_auto_create', true)

  return {
    enabled,
    headerUser,
    headerEmail,
    headerGroups,
    whitelist: whitelistStr.split(',').map((s) => s.trim()).filter(Boolean),
    defaultGroupId,
    autoCreate,
  }
}

export async function isProxyAuthEnabled(): Promise<boolean> {
  return getSettingBoolean('auth_proxy_enabled', false)
}

// ---------------------------------------------------------------------------
// CIDR Parsing & IP Validation
// ---------------------------------------------------------------------------

interface CIDR {
  base: bigint
  mask: bigint
  version: 4 | 6
}

export function parseCIDR(cidr: string): CIDR | null {
  const parts = cidr.split('/')
  const ipPart = parts[0]
  const prefixLen = parts[1] ? parseInt(parts[1], 10) : null

  // Detect IPv4 vs IPv6
  const isIPv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(ipPart)
  const isIPv6 = ipPart.includes(':')

  if (isIPv4) {
    const octets = ipPart.split('.').map((o) => parseInt(o, 10))
    if (octets.length !== 4 || octets.some((o) => o < 0 || o > 255)) return null

    const ipNum = BigInt((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3])
    const prefix = prefixLen ?? 32
    if (prefix < 0 || prefix > 32) return null

    const mask = prefix === 0 ? 0n : (0xFFFFFFFFn << BigInt(32 - prefix)) & 0xFFFFFFFFn
    const base = ipNum & mask

    return { base, mask, version: 4 }
  }

  if (isIPv6) {
    // Expand IPv6 address
    const expanded = expandIPv6(ipPart)
    if (!expanded) return null

    const ipNum = ipv6ToBigInt(expanded)
    const prefix = prefixLen ?? 128
    if (prefix < 0 || prefix > 128) return null

    const mask = prefix === 0 ? 0n : (2n ** 128n - 1n) << BigInt(128 - prefix)
    const base = ipNum & mask

    return { base, mask, version: 6 }
  }

  return null
}

function expandIPv6(ip: string): string | null {
  // Expand :: notation
  const parts = ip.split('::')
  if (parts.length > 2) return null

  let left = parts[0] ? parts[0].split(':') : []
  let right = parts.length === 2 ? (parts[1] ? parts[1].split(':') : []) : []

  // If no ::, must be 8 groups
  if (parts.length === 1) {
    if (left.length !== 8) return null
    return left.map((g) => g.padStart(4, '0')).join(':')
  }

  // Expand ::
  const missing = 8 - (left.length + right.length)
  if (missing < 0) return null

  const middle = Array(missing).fill('0000')
  const full = [...left, ...middle, ...right]
  return full.map((g) => g.padStart(4, '0')).join(':')
}

function ipv6ToBigInt(ip: string): bigint {
  const groups = ip.split(':')
  let result = 0n
  for (const group of groups) {
    result = (result << 16n) | BigInt(parseInt(group, 16))
  }
  return result
}

function ipv4ToBigInt(ip: string): bigint {
  const octets = ip.split('.').map((o) => parseInt(o, 10))
  return BigInt((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3])
}

export function ipInRange(ip: string, cidr: CIDR): boolean {
  if (cidr.version === 4) {
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return false
    const ipNum = ipv4ToBigInt(ip)
    return (ipNum & cidr.mask) === cidr.base
  } else {
    // IPv6
    const expanded = expandIPv6(ip)
    if (!expanded) return false
    const ipNum = ipv6ToBigInt(expanded)
    return (ipNum & cidr.mask) === cidr.base
  }
}

export function isTrustedProxy(ip: string, whitelist: string[]): boolean {
  for (const entry of whitelist) {
    if (entry === ip) return true

    const cidr = parseCIDR(entry)
    if (cidr && ipInRange(ip, cidr)) return true
  }
  return false
}

// ---------------------------------------------------------------------------
// User Management
// ---------------------------------------------------------------------------

export async function findOrCreateProxyUser(opts: {
  username: string
  email: string | null
  groupId: number
}): Promise<{ id: number; username: string; email: string | null; groupName: string | null; group_id: number | null; image: string | null }> {
  const ctx = dialectCtx()

  let rows: unknown[]
  if (ctx.dialect === 'sqlite') {
    rows = ctx.db.select().from(ctx.users).where(eq(ctx.users.username, opts.username)).all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db.select().from(ctx.users).where(eq(ctx.users.username, opts.username))
  } else {
    rows = await ctx.db.select().from(ctx.users).where(eq(ctx.users.username, opts.username))
  }

  if (rows.length > 0) {
    const row = rows[0] as { id: number; username: string; email: string | null; groupName: string | null; group_id: number | null; image: string | null }
    return row
  }

  const now = new Date()

  if (ctx.dialect === 'sqlite') {
    const result = ctx.db.insert(ctx.users).values({
      username: opts.username,
      email: opts.email,
      password: '',
      group_id: opts.groupId,
      auth_service: 'proxy',
      register_date: now.toISOString(),
      locked: 0,
    }).returning({ id: ctx.users.id, username: ctx.users.username, email: ctx.users.email, groupName: ctx.users.groupName, group_id: ctx.users.group_id, image: ctx.users.image }).get()

    return result as { id: number; username: string; email: string | null; groupName: string | null; group_id: number | null; image: string | null }
  } else if (ctx.dialect === 'mysql') {
    await ctx.db.insert(ctx.users).values({
      username: opts.username,
      email: opts.email,
      password: '',
      group_id: opts.groupId,
      auth_service: 'proxy',
      register_date: now,
      locked: 0,
    })

    const fetchRows = await ctx.db.select().from(ctx.users).where(eq(ctx.users.username, opts.username))
    if (fetchRows.length === 0) {
      throw new Error('Failed to create proxy user')
    }

    return fetchRows[0] as { id: number; username: string; email: string | null; groupName: string | null; group_id: number | null; image: string | null }
  } else {
    await ctx.db.insert(ctx.users).values({
      username: opts.username,
      email: opts.email,
      password: '',
      group_id: opts.groupId,
      auth_service: 'proxy',
      register_date: now,
      locked: 0,
    })

    const fetchRows = await ctx.db.select().from(ctx.users).where(eq(ctx.users.username, opts.username))
    if (fetchRows.length === 0) {
      throw new Error('Failed to create proxy user')
    }

    return fetchRows[0] as { id: number; username: string; email: string | null; groupName: string | null; group_id: number | null; image: string | null }
  }
}

export function extractProxyUser(headers: Record<string, string | undefined>, config: ProxyAuthConfig): {
  username: string | null
  email: string | null
  groups: string[] | null
} {
  const username = headers[config.headerUser.toLowerCase()] ?? null
  const email = headers[config.headerEmail.toLowerCase()] ?? null
  const groupsStr = headers[config.headerGroups.toLowerCase()] ?? null
  const groups = groupsStr ? groupsStr.split(',').map((g) => g.trim()).filter(Boolean) : null

  return { username, email, groups }
}

// ---------------------------------------------------------------------------
// Main Auth Flow
// ---------------------------------------------------------------------------

export async function authenticateProxyUser(clientIp: string, headers: Record<string, string | undefined>): Promise<{ token: string } | null> {
  const config = await getProxyAuthConfig()

  if (!config.enabled) return null

  // Validate IP
  if (!isTrustedProxy(clientIp, config.whitelist)) {
    return null
  }

  // Extract headers
  const { username, email } = extractProxyUser(headers, config)
  if (!username) return null

  // Create or find user
  if (!config.autoCreate) {
    // Only allow existing users
    const ctx = dialectCtx()
    let rows: unknown[]
    if (ctx.dialect === 'sqlite') {
      rows = ctx.db.select().from(ctx.users).where(eq(ctx.users.username, username)).all()
    } else if (ctx.dialect === 'mysql') {
      rows = await ctx.db.select().from(ctx.users).where(eq(ctx.users.username, username))
    } else {
      rows = await ctx.db.select().from(ctx.users).where(eq(ctx.users.username, username))
    }
    if (rows.length === 0) return null
  }

  const user = await findOrCreateProxyUser({
    username,
    email,
    groupId: config.defaultGroupId,
  })

  // Create access token
  const authUser = toAuthUser(user)
  const token = await createAccessToken(authUser)

  return { token }
}
