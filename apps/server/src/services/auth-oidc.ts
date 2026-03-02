import * as client from 'openid-client'
import { eq, or } from 'drizzle-orm'

import { getRawDb, getDialect, type SqliteDb, type MysqlDb, type PostgresDb } from '../db'
import * as sqliteSchema from '../db/schema/sqlite'
import * as mysqlSchema from '../db/schema/mysql'
import * as pgSchema from '../db/schema/pg'
import {
  getSettingString,
  getSettingBoolean,
  getSettingNumber,
  getSettingJSON,
} from './settings'
import { hashPassword, toAuthUser } from './auth'

import type { AuthUser } from '@organizrx/shared'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OidcConfig {
  enabled: boolean
  providerUrl: string
  clientId: string
  clientSecret: string
  scopes: string
  redirectUri: string
  groupClaim: string
  groupMapping: Record<string, number>
  autoCreateUser: boolean
  defaultGroupId: number
}

export interface OidcAuthState {
  codeVerifier: string
  state: string
  nonce: string
  createdAt: number
}

export interface OidcUserInfo {
  sub: string
  email: string | null
  preferredUsername: string | null
  name: string | null
  picture: string | null
  groups: string[]
}

// ---------------------------------------------------------------------------
// In-memory PKCE/state store with TTL cleanup
// ---------------------------------------------------------------------------

const STATE_TTL_MS = 600_000 // 10 minutes
const oidcStateStore = new Map<string, OidcAuthState>()

function cleanupExpiredStates(): void {
  const now = Date.now()
  for (const [key, entry] of oidcStateStore) {
    if (now - entry.createdAt > STATE_TTL_MS) {
      oidcStateStore.delete(key)
    }
  }
}

export function storeOidcState(state: string, entry: OidcAuthState): void {
  cleanupExpiredStates()
  oidcStateStore.set(state, entry)
}

export function retrieveAndDeleteOidcState(state: string): OidcAuthState | null {
  cleanupExpiredStates()
  const entry = oidcStateStore.get(state)
  if (!entry) return null
  oidcStateStore.delete(state)
  return entry
}

export function _resetOidcStateStore(): void {
  oidcStateStore.clear()
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
// OIDC configuration loader
// ---------------------------------------------------------------------------

export async function getOidcConfig(): Promise<OidcConfig> {
  const [
    enabled,
    providerUrl,
    clientId,
    clientSecret,
    scopes,
    redirectUri,
    groupClaim,
    groupMapping,
    autoCreateUser,
    defaultGroupId,
  ] = await Promise.all([
    getSettingBoolean('oidc_enabled', false),
    getSettingString('oidc_provider_url', ''),
    getSettingString('oidc_client_id', ''),
    getSettingString('oidc_client_secret', ''),
    getSettingString('oidc_scopes', 'openid profile email'),
    getSettingString('oidc_redirect_uri', ''),
    getSettingString('oidc_group_claim', 'groups'),
    getSettingJSON<Record<string, number>>('oidc_group_mapping', {}),
    getSettingBoolean('oidc_auto_create_user', true),
    getSettingNumber('oidc_default_group_id', 4),
  ])

  return {
    enabled,
    providerUrl,
    clientId,
    clientSecret,
    scopes,
    redirectUri,
    groupClaim,
    groupMapping,
    autoCreateUser,
    defaultGroupId,
  }
}

// ---------------------------------------------------------------------------
// OIDC Discovery
// ---------------------------------------------------------------------------

export async function discoverOidcProvider(
  issuerUrl: string,
  clientId: string,
  clientSecret: string,
): Promise<client.Configuration> {
  const config = await client.discovery(
    new URL(issuerUrl),
    clientId,
    clientSecret,
  )
  return config
}

// ---------------------------------------------------------------------------
// Build Authorization URL with PKCE
// ---------------------------------------------------------------------------

export interface OidcAuthUrlResult {
  url: string
  state: string
  codeVerifier: string
  nonce: string
}

export async function buildOidcAuthUrl(
  config: client.Configuration,
  redirectUri: string,
  scopes: string,
): Promise<OidcAuthUrlResult> {
  const codeVerifier = client.randomPKCECodeVerifier()
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier)
  const state = client.randomState()
  const nonce = client.randomNonce()

  const parameters: Record<string, string> = {
    redirect_uri: redirectUri,
    scope: scopes,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  }

  const redirectTo = client.buildAuthorizationUrl(config, parameters)

  return {
    url: redirectTo.href,
    state,
    codeVerifier,
    nonce,
  }
}

// ---------------------------------------------------------------------------
// Exchange authorization code for tokens
// ---------------------------------------------------------------------------

export interface OidcTokenResult {
  claims: Record<string, unknown>
  accessToken: string
}

export async function exchangeOidcCode(
  config: client.Configuration,
  callbackUrl: URL,
  codeVerifier: string,
  expectedState: string,
  expectedNonce: string,
): Promise<OidcTokenResult> {
  const tokens = await client.authorizationCodeGrant(
    config,
    callbackUrl,
    {
      pkceCodeVerifier: codeVerifier,
      expectedState,
      expectedNonce,
      idTokenExpected: true,
    },
  )

  const claims = tokens.claims()
  if (!claims) {
    throw new Error('No ID token claims received from OIDC provider')
  }

  return {
    claims: claims as Record<string, unknown>,
    accessToken: tokens.access_token,
  }
}

// ---------------------------------------------------------------------------
// Group mapping
// ---------------------------------------------------------------------------

export function mapOidcGroupsToOrganizr(
  idTokenClaims: Record<string, unknown>,
  groupClaimPath: string,
  mapping: Record<string, number>,
  defaultGroupId: number,
): number {
  const rawGroups = extractClaimByPath(idTokenClaims, groupClaimPath)
  const groups = normalizeGroups(rawGroups)

  if (groups.length === 0) {
    return defaultGroupId
  }

  const matchedGroupIds: number[] = []

  for (const group of groups) {
    // Direct match
    if (group in mapping) {
      matchedGroupIds.push(mapping[group])
      continue
    }

    // Try without leading slash (Keycloak nested groups)
    const stripped = group.replace(/^\//, '')
    if (stripped in mapping) {
      matchedGroupIds.push(mapping[stripped])
      continue
    }

    // Try last segment only
    const segments = stripped.split('/')
    const lastSegment = segments[segments.length - 1]
    if (lastSegment && lastSegment in mapping) {
      matchedGroupIds.push(mapping[lastSegment])
    }
  }

  if (matchedGroupIds.length === 0) {
    return defaultGroupId
  }

  // Lower group_id = higher privilege; return highest privilege
  return Math.min(...matchedGroupIds)
}

function extractClaimByPath(claims: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = claims

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }

  return current
}

function normalizeGroups(rawGroups: unknown): string[] {
  if (Array.isArray(rawGroups)) {
    return rawGroups.filter((g): g is string => typeof g === 'string')
  }

  // Handle Zitadel-style object keys
  if (rawGroups !== null && typeof rawGroups === 'object' && !Array.isArray(rawGroups)) {
    return Object.keys(rawGroups as Record<string, unknown>)
  }

  if (typeof rawGroups === 'string') {
    return [rawGroups]
  }

  return []
}

// ---------------------------------------------------------------------------
// Extract user info from ID token claims
// ---------------------------------------------------------------------------

export function extractOidcUserInfo(
  claims: Record<string, unknown>,
  groupClaimPath: string,
): OidcUserInfo {
  const rawGroups = extractClaimByPath(claims, groupClaimPath)
  const groups = normalizeGroups(rawGroups)

  return {
    sub: String(claims.sub ?? ''),
    email: typeof claims.email === 'string' ? claims.email : null,
    preferredUsername: typeof claims.preferred_username === 'string'
      ? claims.preferred_username
      : null,
    name: typeof claims.name === 'string' ? claims.name : null,
    picture: typeof claims.picture === 'string' ? claims.picture : null,
    groups,
  }
}

// ---------------------------------------------------------------------------
// Find or create OIDC user
// ---------------------------------------------------------------------------

interface UserRow {
  id: number
  username: string | null
  password: string | null
  email: string | null
  group: string | null
  group_id: number | null
  locked: number | null
  image: string | null
  auth_service: string | null
}

async function findUserByEmailOrAuthService(
  email: string | null,
  oidcSub: string,
): Promise<UserRow | null> {
  const ctx = dialectCtx()
  const authServiceValue = `oidc:${oidcSub}`

  let rows: unknown[]

  if (email) {
    if (ctx.dialect === 'sqlite') {
      rows = ctx.db.select().from(ctx.users)
        .where(or(
          eq(ctx.users.email, email),
          eq(ctx.users.auth_service, authServiceValue),
        ))
        .all()
    } else if (ctx.dialect === 'mysql') {
      rows = await ctx.db.select().from(ctx.users)
        .where(or(
          eq(ctx.users.email, email),
          eq(ctx.users.auth_service, authServiceValue),
        ))
    } else {
      rows = await ctx.db.select().from(ctx.users)
        .where(or(
          eq(ctx.users.email, email),
          eq(ctx.users.auth_service, authServiceValue),
        ))
    }
  } else {
    if (ctx.dialect === 'sqlite') {
      rows = ctx.db.select().from(ctx.users)
        .where(eq(ctx.users.auth_service, authServiceValue))
        .all()
    } else if (ctx.dialect === 'mysql') {
      rows = await ctx.db.select().from(ctx.users)
        .where(eq(ctx.users.auth_service, authServiceValue))
    } else {
      rows = await ctx.db.select().from(ctx.users)
        .where(eq(ctx.users.auth_service, authServiceValue))
    }
  }

  if (rows.length === 0) return null
  return rows[0] as UserRow
}

export async function findOrCreateOidcUser(
  oidcUser: OidcUserInfo,
  groupId: number,
  groupName: string,
  autoCreate: boolean,
): Promise<AuthUser | null> {
  // Try to find existing user by auth_service or email
  const existing = await findUserByEmailOrAuthService(oidcUser.email, oidcUser.sub)

  if (existing) {
    // Update auth_service and group info
    await updateUserOidc(existing.id, oidcUser.sub, groupId, groupName)

    return toAuthUser({
      id: existing.id,
      username: existing.username,
      email: oidcUser.email ?? existing.email,
      group: groupName,
      group_id: groupId,
      image: oidcUser.picture ?? existing.image,
    })
  }

  if (!autoCreate) {
    return null
  }

  // Create new user
  const username = oidcUser.preferredUsername ?? oidcUser.name ?? oidcUser.sub
  const randomPassword = crypto.randomUUID()
  const hashedPassword = await hashPassword(randomPassword)

  const ctx = dialectCtx()
  const authServiceValue = `oidc:${oidcUser.sub}`
  const now = new Date()

  let userId: number

  if (ctx.dialect === 'sqlite') {
    const result = ctx.db.insert(ctx.users).values({
      username,
      password: hashedPassword,
      email: oidcUser.email,
      group: groupName,
      group_id: groupId,
      image: oidcUser.picture ?? null,
      register_date: now.toISOString(),
      auth_service: authServiceValue,
      locked: 0,
    }).run()

    userId = Number((result as unknown as { lastInsertRowid: number }).lastInsertRowid)
  } else if (ctx.dialect === 'mysql') {
    const result = await ctx.db.insert(ctx.users).values({
      username,
      password: hashedPassword,
      email: oidcUser.email,
      group: groupName,
      group_id: groupId,
      image: oidcUser.picture ?? null,
      register_date: now,
      auth_service: authServiceValue,
      locked: 0,
    })

    userId = Number(result[0].insertId)
  } else {
    const result = await ctx.db.insert(ctx.users).values({
      username,
      password: hashedPassword,
      email: oidcUser.email,
      group: groupName,
      group_id: groupId,
      image: oidcUser.picture ?? null,
      register_date: now,
      auth_service: authServiceValue,
      locked: 0,
    }).returning({ id: ctx.users.id })

    userId = (result[0] as { id: number }).id
  }

  return toAuthUser({
    id: userId,
    username,
    email: oidcUser.email,
    group: groupName,
    group_id: groupId,
    image: oidcUser.picture ?? null,
  })
}

// ---------------------------------------------------------------------------
// Link existing user to OIDC
// ---------------------------------------------------------------------------

export async function linkOidcAccount(userId: number, oidcSub: string): Promise<void> {
  const ctx = dialectCtx()
  const authServiceValue = `oidc:${oidcSub}`

  if (ctx.dialect === 'sqlite') {
    ctx.db.update(ctx.users)
      .set({ auth_service: authServiceValue })
      .where(eq(ctx.users.id, userId))
      .run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db.update(ctx.users)
      .set({ auth_service: authServiceValue })
      .where(eq(ctx.users.id, userId))
  } else {
    await ctx.db.update(ctx.users)
      .set({ auth_service: authServiceValue })
      .where(eq(ctx.users.id, userId))
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function updateUserOidc(
  userId: number,
  oidcSub: string,
  groupId: number,
  groupName: string,
): Promise<void> {
  const ctx = dialectCtx()
  const authServiceValue = `oidc:${oidcSub}`

  const updates = {
    auth_service: authServiceValue,
    group: groupName,
    group_id: groupId,
  }

  if (ctx.dialect === 'sqlite') {
    ctx.db.update(ctx.users)
      .set(updates)
      .where(eq(ctx.users.id, userId))
      .run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db.update(ctx.users)
      .set(updates)
      .where(eq(ctx.users.id, userId))
  } else {
    await ctx.db.update(ctx.users)
      .set(updates)
      .where(eq(ctx.users.id, userId))
  }
}

// ---------------------------------------------------------------------------
// Group name resolver
// ---------------------------------------------------------------------------

const GROUP_NAMES: Record<number, string> = {
  0: 'Admin',
  1: 'Co-Admin',
  2: 'Super User',
  3: 'Power User',
  4: 'User',
  999: 'Guest',
}

export function getGroupNameById(groupId: number): string {
  return GROUP_NAMES[groupId] ?? 'User'
}
