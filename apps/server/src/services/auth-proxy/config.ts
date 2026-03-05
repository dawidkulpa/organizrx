import { getSettingBoolean, getSettingString, getSettingNumber } from '../settings'

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
    whitelist: whitelistStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    defaultGroupId,
    autoCreate,
  }
}

export async function isProxyAuthEnabled(): Promise<boolean> {
  return getSettingBoolean('auth_proxy_enabled', false)
}

export function extractProxyUser(
  headers: Record<string, string | undefined>,
  config: ProxyAuthConfig
): {
  username: string | null
  email: string | null
  groups: string[] | null
} {
  const username = headers[config.headerUser.toLowerCase()] ?? null
  const email = headers[config.headerEmail.toLowerCase()] ?? null
  const groupsStr = headers[config.headerGroups.toLowerCase()] ?? null
  const groups = groupsStr
    ? groupsStr
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean)
    : null

  return { username, email, groups }
}
