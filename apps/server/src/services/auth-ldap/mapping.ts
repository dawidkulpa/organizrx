// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LdapUserInfo {
  username: string
  email: string | null
  displayName: string | null
  groups: string[]
}

// ---------------------------------------------------------------------------
// LDAP group → OrganizrX group mapping
// ---------------------------------------------------------------------------

export function mapLdapGroupToOrganizr(
  ldapGroups: string[],
  mapping: Record<string, number>
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
      const match =
        ldapGroup.toLowerCase().includes(mapKey.toLowerCase()) ||
        (cn !== null && cn.toLowerCase() === mapKey.toLowerCase())

      if (match && mapGroupId < bestGroupId) {
        bestGroupId = mapGroupId
      }
    }
  }

  return bestGroupId
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function extractStringAttr(entry: Record<string, unknown>, attr: string): string | null {
  const val = entry[attr]
  if (typeof val === 'string' && val.length > 0) return val
  if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') {
    return val[0]
  }
  return null
}

export function extractStringArrayAttr(entry: Record<string, unknown>, attr: string): string[] {
  const val = entry[attr]
  if (typeof val === 'string') return [val]
  if (Array.isArray(val)) return val.filter((v): v is string => typeof v === 'string')
  return []
}

export function extractCnFromDn(dn: string): string | null {
  const match = /^cn=([^,]+)/i.exec(dn)
  return match ? match[1] : null
}

export function getGroupNameFromId(groupId: number): string {
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
