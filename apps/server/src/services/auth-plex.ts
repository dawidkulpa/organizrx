import { eq, or } from 'drizzle-orm'
import { getRawDb, getDialect, type SqliteDb, type MysqlDb, type PostgresDb } from '../db'
import * as sqliteSchema from '../db/schema/sqlite'
import * as mysqlSchema from '../db/schema/mysql'
import * as pgSchema from '../db/schema/pg'
import { getSetting, getSettingBoolean, getSettingNumber } from './settings'
import type { AuthUser } from '@organizrx/shared'
import { toAuthUser } from './auth'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlexPinResponse {
  id: number
  code: string
  authToken: string | null
}

export interface PlexUserInfo {
  id: number
  uuid: string
  email: string
  username: string
  title: string
  thumb: string
}

interface PlexServerInfo {
  name: string
  host: string
  address: string
  port: number
  machineIdentifier: string
  version: string
}

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
// Plex Client Identifiers
// ---------------------------------------------------------------------------

let cachedClientId: string | null = null

async function getClientIdentifier(): Promise<string> {
  if (cachedClientId) return cachedClientId

  let clientId = await getSetting('plex_client_id')
  if (!clientId) {
    clientId = crypto.randomUUID()
    const { setSetting } = await import('./settings')
    await setSetting('plex_client_id', clientId)
  }
  cachedClientId = clientId
  return clientId
}

// ---------------------------------------------------------------------------
// Plex API Headers
// ---------------------------------------------------------------------------

async function getPlexHeaders(authToken?: string): Promise<Record<string, string>> {
  const clientId = await getClientIdentifier()
  const headers: Record<string, string> = {
    'X-Plex-Client-Identifier': clientId,
    'X-Plex-Product': 'OrganizrX',
    'X-Plex-Version': '1.0.0',
    'Accept': 'application/json',
  }
  if (authToken) {
    headers['X-Plex-Token'] = authToken
  }
  return headers
}

// ---------------------------------------------------------------------------
// Plex OAuth Flow (PIN-based)
// ---------------------------------------------------------------------------

export async function initiatePlexAuth(): Promise<{ pinId: number; code: string; authUrl: string }> {
  const headers = await getPlexHeaders()

  const response = await fetch('https://plex.tv/api/v2/pins', {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ strong: true }),
  })

  if (!response.ok) {
    throw new Error(`Plex PIN request failed: ${response.statusText}`)
  }

  const data = await response.json() as PlexPinResponse

  const clientId = await getClientIdentifier()
  const authUrl = `https://app.plex.tv/auth#?clientID=${clientId}&code=${data.code}&context[device][product]=OrganizrX`

  return {
    pinId: data.id,
    code: data.code,
    authUrl,
  }
}

export async function pollPlexAuth(pinId: number): Promise<string | null> {
  const headers = await getPlexHeaders()

  const response = await fetch(`https://plex.tv/api/v2/pins/${pinId}`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    throw new Error(`Plex PIN poll failed: ${response.statusText}`)
  }

  const data = await response.json() as PlexPinResponse
  return data.authToken
}

// ---------------------------------------------------------------------------
// Plex User Verification
// ---------------------------------------------------------------------------

export async function verifyPlexToken(token: string): Promise<PlexUserInfo> {
  const headers = await getPlexHeaders(token)

  const response = await fetch('https://plex.tv/api/v2/user', {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    throw new Error(`Plex user verification failed: ${response.statusText}`)
  }

  const data = await response.json() as PlexUserInfo
  return data
}

// ---------------------------------------------------------------------------
// Plex Server Access Check
// ---------------------------------------------------------------------------

export async function checkPlexServerAccess(token: string, serverId: string): Promise<boolean> {
  const headers = await getPlexHeaders(token)

  // Get user's account info to check if they're the server owner
  const userResponse = await fetch('https://plex.tv/api/v2/user', {
    method: 'GET',
    headers,
  })

  if (!userResponse.ok) {
    return false
  }

  await userResponse.json() // Consume response

  // Get list of servers accessible to this user
  const serversResponse = await fetch('https://plex.tv/api/v2/resources?includeHttps=1&includeRelay=1', {
    method: 'GET',
    headers,
  })

  if (!serversResponse.ok) {
    return false
  }

  const servers = await serversResponse.json() as PlexServerInfo[]

  // Check if the configured server is in the user's accessible servers list
  const hasAccess = servers.some((server) => server.machineIdentifier === serverId)

  return hasAccess
}

// ---------------------------------------------------------------------------
// User Creation / Lookup
// ---------------------------------------------------------------------------

export async function findOrCreatePlexUser(
  plexUser: PlexUserInfo,
  plexToken: string,
  groupId: number
): Promise<AuthUser> {
  const ctx = dialectCtx()

  // Try to find existing user by email or username
  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db.select()
      .from(ctx.users)
      .where(
        or(
          eq(ctx.users.email, plexUser.email),
          eq(ctx.users.username, plexUser.username)
        )
      )
      .all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db.select()
      .from(ctx.users)
      .where(
        or(
          eq(ctx.users.email, plexUser.email),
          eq(ctx.users.username, plexUser.username)
        )
      )
  } else {
    rows = await ctx.db.select()
      .from(ctx.users)
      .where(
        or(
          eq(ctx.users.email, plexUser.email),
          eq(ctx.users.username, plexUser.username)
        )
      )
  }

  if (rows.length > 0) {
    // Update existing user with Plex token
    const existingUser = rows[0] as { id: number; username: string | null; email: string | null; groupName: string | null; group_id: number | null; image: string | null }

    if (ctx.dialect === 'sqlite') {
      ctx.db.update(ctx.users)
        .set({ plex_token: plexToken, auth_service: 'plex', image: plexUser.thumb })
        .where(eq(ctx.users.id, existingUser.id))
        .run()
    } else if (ctx.dialect === 'mysql') {
      await ctx.db.update(ctx.users)
        .set({ plex_token: plexToken, auth_service: 'plex', image: plexUser.thumb })
        .where(eq(ctx.users.id, existingUser.id))
    } else {
      await ctx.db.update(ctx.users)
        .set({ plex_token: plexToken, auth_service: 'plex', image: plexUser.thumb })
        .where(eq(ctx.users.id, existingUser.id))
    }

    return toAuthUser({
      id: existingUser.id,
      username: existingUser.username,
      email: existingUser.email,
      groupName: existingUser.groupName,
      group_id: existingUser.group_id,
      image: plexUser.thumb,
    })
  }

  // Create new user
  const now = new Date()
  const newUser = {
    username: plexUser.username,
    password: '', // No password for Plex users
    email: plexUser.email,
    plex_token: plexToken,
    group_id: groupId,
    groupName: null, // Will be set by a trigger or post-processing
    locked: 0,
    image: plexUser.thumb,
    auth_service: 'plex',
    register_date: ctx.dialect === 'sqlite' ? now.toISOString() : now,
  }

  let insertedId: number

  if (ctx.dialect === 'sqlite') {
    ctx.db.insert(ctx.users).values({ ...newUser, register_date: now.toISOString() }).run()
    insertedId = Number(ctx.db.select({ id: ctx.users.id }).from(ctx.users).orderBy(ctx.users.id).all().pop()?.id ?? 0)
  } else if (ctx.dialect === 'mysql') {
    const result = await ctx.db.insert(ctx.users).values({ ...newUser, register_date: now })
    insertedId = Number(result[0].insertId)
  } else {
    const result = await ctx.db.insert(ctx.users).values({ ...newUser, register_date: now }).returning({ id: ctx.users.id })
    insertedId = result[0].id
  }

  // Fetch the group name
  let groupName: string | null = null
  if (ctx.dialect === 'sqlite') {
    const groupRows = ctx.db.select().from(sqliteSchema.groups).where(eq(sqliteSchema.groups.group_id, groupId)).all()
    if (groupRows.length > 0) {
      groupName = (groupRows[0] as { name: string | null }).name
    }
  } else if (ctx.dialect === 'mysql') {
    const groupRows = await ctx.db.select().from(mysqlSchema.groups).where(eq(mysqlSchema.groups.group_id, groupId))
    if (groupRows.length > 0) {
      groupName = (groupRows[0] as { name: string | null }).name
    }
  } else {
    const groupRows = await ctx.db.select().from(pgSchema.groups).where(eq(pgSchema.groups.group_id, groupId))
    if (groupRows.length > 0) {
      groupName = (groupRows[0] as { name: string | null }).name
    }
  }

  return toAuthUser({
    id: insertedId,
    username: plexUser.username,
    email: plexUser.email,
    groupName: groupName,
    group_id: groupId,
    image: plexUser.thumb,
  })
}

// ---------------------------------------------------------------------------
// Link Existing User to Plex
// ---------------------------------------------------------------------------

export async function linkPlexAccount(userId: number, plexToken: string): Promise<void> {
  const ctx = dialectCtx()

  // Verify the Plex token and get user info
  const plexUser = await verifyPlexToken(plexToken)

  if (ctx.dialect === 'sqlite') {
    ctx.db.update(ctx.users)
      .set({ plex_token: plexToken, auth_service: 'plex', image: plexUser.thumb })
      .where(eq(ctx.users.id, userId))
      .run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db.update(ctx.users)
      .set({ plex_token: plexToken, auth_service: 'plex', image: plexUser.thumb })
      .where(eq(ctx.users.id, userId))
  } else {
    await ctx.db.update(ctx.users)
      .set({ plex_token: plexToken, auth_service: 'plex', image: plexUser.thumb })
      .where(eq(ctx.users.id, userId))
  }
}

// ---------------------------------------------------------------------------
// Config Helpers
// ---------------------------------------------------------------------------

export async function isPlexAuthEnabled(): Promise<boolean> {
  return getSettingBoolean('plex_enabled', false)
}

export async function getPlexServerId(): Promise<string | null> {
  return getSetting('plex_server_id')
}

export async function isPlexAdminOnly(): Promise<boolean> {
  return getSettingBoolean('plex_admin_only', false)
}

export async function getPlexDefaultGroupId(): Promise<number> {
  return getSettingNumber('plex_default_group_id', 4)
}
