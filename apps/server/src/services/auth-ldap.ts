import { Client } from 'ldapts'
import { eq } from 'drizzle-orm'

import { getRawDb, getDialect, type SqliteDb, type MysqlDb, type PostgresDb } from '../db'
import * as sqliteSchema from '../db/schema/sqlite'
import * as mysqlSchema from '../db/schema/mysql'
import * as pgSchema from '../db/schema/pg'
import {
  getSettingBoolean,
  getSettingString,
  getSettingNumber,
  getSettingJSON,
} from './settings'
import { hashPassword, toAuthUser } from './auth'

import type { AuthUser } from '@organizrx/shared'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LdapType = 'ad' | 'openldap' | 'freeipa'

export interface LdapConfig {
  host: string
  port: number
  baseDn: string
  bindUsername: string
  bindPassword: string
  ldapType: LdapType
  ssl: boolean
  tls: boolean
  searchFilter: string
  groupMapping: Record<string, number>
}

export interface LdapUserInfo {
  username: string
  email: string | null
  displayName: string | null
  groups: string[]
}

interface LdapConnectionResult {
  success: boolean
  message: string
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
// LDAP special character escaping (RFC 4515)
// ---------------------------------------------------------------------------

const LDAP_ESCAPE_MAP: Record<string, string> = {
  '\\': '\\5c',
  '*': '\\2a',
  '(': '\\28',
  ')': '\\29',
  '\0': '\\00',
}

export function escapeLdapFilter(input: string): string {
  return input.replace(/[\\*()\x00]/g, (ch) => LDAP_ESCAPE_MAP[ch] ?? ch)
}

// ---------------------------------------------------------------------------
// Search filter builders by directory type
// ---------------------------------------------------------------------------

function getDefaultSearchFilter(ldapType: LdapType, username: string): string {
  const escaped = escapeLdapFilter(username)
  switch (ldapType) {
    case 'ad':
      return `(&(objectCategory=person)(objectClass=user)(sAMAccountName=${escaped}))`
    case 'openldap':
      return `(&(objectClass=inetOrgPerson)(uid=${escaped}))`
    case 'freeipa':
      return `(&(objectClass=person)(uid=${escaped}))`
    default:
      return `(&(objectClass=person)(uid=${escaped}))`
  }
}

function buildSearchFilter(
  config: LdapConfig,
  username: string,
): string {
  if (config.searchFilter) {
    return config.searchFilter.replace(/\{username\}/g, escapeLdapFilter(username))
  }
  return getDefaultSearchFilter(config.ldapType, username)
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

function buildLdapUrl(config: LdapConfig): string {
  const protocol = config.ssl ? 'ldaps' : 'ldap'
  // Support comma-separated hosts; use first one
  const host = config.host.split(',')[0].trim()
  return `${protocol}://${host}:${config.port}`
}

function createLdapClient(config: LdapConfig): Client {
  const url = buildLdapUrl(config)
  return new Client({
    url,
    timeout: 5000,
    connectTimeout: 5000,
    tlsOptions: config.ssl
      ? { rejectUnauthorized: false }
      : undefined,
    strictDN: false,
  })
}

// ---------------------------------------------------------------------------
// LDAP config loader (from settings service)
// ---------------------------------------------------------------------------

export async function loadLdapConfig(): Promise<LdapConfig> {
  const host = await getSettingString('ldap_host', '')
  const port = await getSettingNumber('ldap_port', 389)
  const baseDn = await getSettingString('ldap_base_dn', '')
  const bindUsername = await getSettingString('ldap_bind_username', '')
  const bindPassword = await getSettingString('ldap_bind_password', '')
  const ldapTypeRaw = await getSettingString('ldap_type', 'ad')
  const ssl = await getSettingBoolean('ldap_ssl', false)
  const tls = await getSettingBoolean('ldap_tls', false)
  const searchFilter = await getSettingString('ldap_search_filter', '')
  const groupMapping = await getSettingJSON<Record<string, number>>(
    'ldap_group_mapping',
    {},
  )

  const ldapType = (['ad', 'openldap', 'freeipa'].includes(ldapTypeRaw)
    ? ldapTypeRaw
    : 'ad') as LdapType

  return {
    host,
    port,
    baseDn,
    bindUsername,
    bindPassword,
    ldapType,
    ssl,
    tls,
    searchFilter,
    groupMapping,
  }
}

export async function isLdapEnabled(): Promise<boolean> {
  return getSettingBoolean('ldap_enabled', false)
}

// ---------------------------------------------------------------------------
// Test LDAP connection
// ---------------------------------------------------------------------------

export async function testLdapConnection(
  config: LdapConfig,
): Promise<LdapConnectionResult> {
  const client = createLdapClient(config)

  try {
    if (config.tls && !config.ssl) {
      await client.startTLS({ rejectUnauthorized: false })
    }

    if (config.bindUsername) {
      await client.bind(config.bindUsername, config.bindPassword)
    } else {
      // Anonymous bind
      await client.bind('', '')
    }

    // Verify base DN is searchable
    const { searchEntries } = await client.search(config.baseDn, {
      scope: 'base',
      filter: '(objectClass=*)',
      sizeLimit: 1,
    })

    await client.unbind()

    return {
      success: searchEntries.length > 0,
      message: searchEntries.length > 0
        ? `Connection successful. Base DN "${config.baseDn}" is reachable.`
        : `Connected but base DN "${config.baseDn}" returned no results.`,
    }
  } catch (err: unknown) {
    try { await client.unbind() } catch { /* ignore unbind errors */ }
    const message = err instanceof Error ? err.message : 'Unknown LDAP error'
    return { success: false, message: `LDAP connection failed: ${message}` }
  }
}

// ---------------------------------------------------------------------------
// Authenticate via LDAP
// ---------------------------------------------------------------------------

export async function authenticateLdap(
  username: string,
  password: string,
  config?: LdapConfig,
): Promise<LdapUserInfo | null> {
  const cfg = config ?? await loadLdapConfig()

  // Phase 1: Service account bind + user search
  const serviceClient = createLdapClient(cfg)

  try {
    if (cfg.tls && !cfg.ssl) {
      await serviceClient.startTLS({ rejectUnauthorized: false })
    }

    // Bind with service account (or anonymous)
    if (cfg.bindUsername) {
      await serviceClient.bind(cfg.bindUsername, cfg.bindPassword)
    } else {
      await serviceClient.bind('', '')
    }

    const filter = buildSearchFilter(cfg, username)
    const { searchEntries } = await serviceClient.search(cfg.baseDn, {
      scope: 'sub',
      filter,
      attributes: [
        'dn',
        'uid',
        'sAMAccountName',
        'mail',
        'displayName',
        'cn',
        'memberOf',
      ],
      sizeLimit: 1,
    })

    await serviceClient.unbind()

    if (searchEntries.length === 0) {
      return null
    }

    const entry = searchEntries[0]
    const userDn = entry.dn

    // Phase 2: Bind as the actual user to verify password
    const userClient = createLdapClient(cfg)

    try {
      if (cfg.tls && !cfg.ssl) {
        await userClient.startTLS({ rejectUnauthorized: false })
      }

      await userClient.bind(userDn, password)
      await userClient.unbind()
    } catch {
      try { await userClient.unbind() } catch { /* ignore */ }
      return null // Invalid credentials
    }

    // Extract user information
    const resolvedUsername = extractStringAttr(entry, 'sAMAccountName')
      ?? extractStringAttr(entry, 'uid')
      ?? username

    const email = extractStringAttr(entry, 'mail')
    const displayName = extractStringAttr(entry, 'displayName')
      ?? extractStringAttr(entry, 'cn')

    const memberOf = extractStringArrayAttr(entry, 'memberOf')

    return {
      username: resolvedUsername,
      email,
      displayName,
      groups: memberOf,
    }
  } catch (err: unknown) {
    try { await serviceClient.unbind() } catch { /* ignore */ }
    const message = err instanceof Error ? err.message : 'Unknown LDAP error'
    throw new Error(`LDAP authentication error: ${message}`)
  }
}

// ---------------------------------------------------------------------------
// LDAP group → OrganizrX group mapping
// ---------------------------------------------------------------------------

export function mapLdapGroupToOrganizr(
  ldapGroups: string[],
  mapping: Record<string, number>,
): number {
  // Default group_id = 999 (Guest) if no mapping matches
  const DEFAULT_GROUP_ID = 999

  if (Object.keys(mapping).length === 0) {
    return DEFAULT_GROUP_ID
  }

  // Find the lowest (most privileged) group_id that matches
  let bestGroupId = DEFAULT_GROUP_ID

  for (const ldapGroup of ldapGroups) {
    // Match against DN or CN
    const cn = extractCnFromDn(ldapGroup)

    for (const [mapKey, mapGroupId] of Object.entries(mapping)) {
      const match = ldapGroup.toLowerCase().includes(mapKey.toLowerCase())
        || (cn !== null && cn.toLowerCase() === mapKey.toLowerCase())

      if (match && mapGroupId < bestGroupId) {
        bestGroupId = mapGroupId
      }
    }
  }

  return bestGroupId
}

// ---------------------------------------------------------------------------
// Find or create local user for LDAP-authenticated user
// ---------------------------------------------------------------------------

export async function findOrCreateLdapUser(
  ldapUser: LdapUserInfo,
  groupId: number,
): Promise<AuthUser> {
  const ctx = dialectCtx()

  // Try to find existing user by username
  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db
      .select()
      .from(ctx.users)
      .where(eq(ctx.users.username, ldapUser.username))
      .all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db
      .select()
      .from(ctx.users)
      .where(eq(ctx.users.username, ldapUser.username))
  } else {
    rows = await ctx.db
      .select()
      .from(ctx.users)
      .where(eq(ctx.users.username, ldapUser.username))
  }

  if (rows.length > 0) {
    const existing = rows[0] as {
      id: number
      username: string | null
      email: string | null
      groupName: string | null
      group_id: number | null
      image: string | null
    }
    return toAuthUser(existing)
  }

  // Create new user with random password hash (LDAP users never use local password)
  const randomPassword = crypto.randomUUID()
  const passwordHash = await hashPassword(randomPassword)

  const groupName = getGroupNameFromId(groupId)

  if (ctx.dialect === 'sqlite') {
    ctx.db.insert(ctx.users).values({
      username: ldapUser.username,
      password: passwordHash,
      email: ldapUser.email,
      groupName: groupName,
      group_id: groupId,
      locked: 0,
      image: null,
      register_date: new Date().toISOString(),
      auth_service: 'ldap',
    }).run()

    // Re-fetch the created user
    const created = ctx.db
      .select()
      .from(ctx.users)
      .where(eq(ctx.users.username, ldapUser.username))
      .all()

    if (created.length === 0) {
      throw new Error('Failed to create LDAP user')
    }

    const user = created[0] as {
      id: number
      username: string | null
      email: string | null
      groupName: string | null
      group_id: number | null
      image: string | null
    }
    return toAuthUser(user)
  }

  // MySQL
  if (ctx.dialect === 'mysql') {
    await ctx.db.insert(ctx.users).values({
      username: ldapUser.username,
      password: passwordHash,
      email: ldapUser.email,
      groupName: groupName,
      group_id: groupId,
      locked: 0,
      image: null,
      register_date: new Date(),
      auth_service: 'ldap',
    })

    const createdRows = await ctx.db
      .select()
      .from(ctx.users)
      .where(eq(ctx.users.username, ldapUser.username))

    if (createdRows.length === 0) {
      throw new Error('Failed to create LDAP user')
    }

    const user = createdRows[0] as {
      id: number
      username: string | null
      email: string | null
      groupName: string | null
      group_id: number | null
      image: string | null
    }
    return toAuthUser(user)
  }

  // PostgreSQL
  await ctx.db.insert(ctx.users).values({
    username: ldapUser.username,
    password: passwordHash,
    email: ldapUser.email,
    groupName: groupName,
    group_id: groupId,
    locked: 0,
    image: null,
    register_date: new Date(),
    auth_service: 'ldap',
  })

  const createdRows = await ctx.db
    .select()
    .from(ctx.users)
    .where(eq(ctx.users.username, ldapUser.username))

  if (createdRows.length === 0) {
    throw new Error('Failed to create LDAP user')
  }

  const user = createdRows[0] as {
    id: number
    username: string | null
    email: string | null
    groupName: string | null
    group_id: number | null
    image: string | null
  }
  return toAuthUser(user)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractStringAttr(
  entry: Record<string, unknown>,
  attr: string,
): string | null {
  const val = entry[attr]
  if (typeof val === 'string' && val.length > 0) return val
  if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') {
    return val[0]
  }
  return null
}

function extractStringArrayAttr(
  entry: Record<string, unknown>,
  attr: string,
): string[] {
  const val = entry[attr]
  if (typeof val === 'string') return [val]
  if (Array.isArray(val)) return val.filter((v): v is string => typeof v === 'string')
  return []
}

function extractCnFromDn(dn: string): string | null {
  const match = /^cn=([^,]+)/i.exec(dn)
  return match ? match[1] : null
}

function getGroupNameFromId(groupId: number): string {
  const groupNames: Record<number, string> = {
    0: 'Admin',
    1: 'Co-Admin',
    2: 'Super User',
    3: 'Power User',
    4: 'User',
    999: 'Guest',
  }
  return groupNames[groupId] ?? 'User'
}

// ---------------------------------------------------------------------------
// LDAP default settings seed
// ---------------------------------------------------------------------------

export const LDAP_DEFAULT_SETTINGS: Record<string, string> = {
  ldap_enabled: 'false',
  ldap_host: '',
  ldap_port: '389',
  ldap_base_dn: '',
  ldap_bind_username: '',
  ldap_bind_password: '',
  ldap_type: 'ad',
  ldap_ssl: 'false',
  ldap_tls: 'false',
  ldap_search_filter: '',
  ldap_group_mapping: '{}',
}
