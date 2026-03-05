import { getSettingBoolean, getSettingString, getSettingNumber, getSettingJSON } from '../settings'

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

export function buildSearchFilter(config: LdapConfig, username: string): string {
  if (config.searchFilter) {
    return config.searchFilter.replace(/\{username\}/g, escapeLdapFilter(username))
  }
  return getDefaultSearchFilter(config.ldapType, username)
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
  const groupMapping = await getSettingJSON<Record<string, number>>('ldap_group_mapping', {})

  const ldapType = (
    ['ad', 'openldap', 'freeipa'].includes(ldapTypeRaw) ? ldapTypeRaw : 'ad'
  ) as LdapType

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
