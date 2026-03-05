// ---------------------------------------------------------------------------
// User mapping from OIDC claims to OrganizrX users
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OidcUserInfo {
  sub: string
  email: string | null
  preferredUsername: string | null
  name: string | null
  picture: string | null
  groups: string[]
}

// ---------------------------------------------------------------------------
// Group mapping
// ---------------------------------------------------------------------------

export function mapOidcGroupsToOrganizr(
  idTokenClaims: Record<string, unknown>,
  groupClaimPath: string,
  mapping: Record<string, number>,
  defaultGroupId: number
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

// ---------------------------------------------------------------------------
// Extract user info from ID token claims
// ---------------------------------------------------------------------------

export function extractOidcUserInfo(
  claims: Record<string, unknown>,
  groupClaimPath: string
): OidcUserInfo {
  const rawGroups = extractClaimByPath(claims, groupClaimPath)
  const groups = normalizeGroups(rawGroups)

  return {
    sub: String(claims.sub ?? ''),
    email: typeof claims.email === 'string' ? claims.email : null,
    preferredUsername:
      typeof claims.preferred_username === 'string' ? claims.preferred_username : null,
    name: typeof claims.name === 'string' ? claims.name : null,
    picture: typeof claims.picture === 'string' ? claims.picture : null,
    groups,
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

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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
