import { getSetting } from '../settings'

// ---------------------------------------------------------------------------
// Plex Client Identifiers
// ---------------------------------------------------------------------------

let cachedClientId: string | null = null

async function getClientIdentifier(): Promise<string> {
  if (cachedClientId) return cachedClientId

  let clientId = await getSetting('plex_client_id')
  if (!clientId) {
    clientId = crypto.randomUUID()
    const { setSetting } = await import('../settings')
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
    Accept: 'application/json',
  }
  if (authToken) {
    headers['X-Plex-Token'] = authToken
  }
  return headers
}

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

// ---------------------------------------------------------------------------
// Plex OAuth Flow (PIN-based)
// ---------------------------------------------------------------------------

export async function initiatePlexAuth(): Promise<{
  pinId: number
  code: string
  authUrl: string
}> {
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

  const data = (await response.json()) as PlexPinResponse

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

  const data = (await response.json()) as PlexPinResponse
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

  const data = (await response.json()) as PlexUserInfo
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
  const serversResponse = await fetch(
    'https://plex.tv/api/v2/resources?includeHttps=1&includeRelay=1',
    {
      method: 'GET',
      headers,
    }
  )

  if (!serversResponse.ok) {
    return false
  }

  const servers = (await serversResponse.json()) as PlexServerInfo[]

  // Check if the configured server is in the user's accessible servers list
  const hasAccess = servers.some((server) => server.machineIdentifier === serverId)

  return hasAccess
}
