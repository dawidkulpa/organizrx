import { Client } from 'ldapts'

import type { LdapConfig } from './filter'
import { loadLdapConfig, buildSearchFilter } from './filter'
import { extractStringAttr, extractStringArrayAttr, type LdapUserInfo } from './mapping'
// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

function buildLdapUrl(config: LdapConfig): string {
  const protocol = config.ssl ? 'ldaps' : 'ldap'
  // Support comma-separated hosts; use first one
  const host = config.host.split(',')[0].trim()
  return `${protocol}://${host}:${config.port}`
}

export function createLdapClient(config: LdapConfig): Client {
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
// Test LDAP connection
// ---------------------------------------------------------------------------

interface LdapConnectionResult {
  success: boolean
  message: string
}

export async function testLdapConnection(config: LdapConfig): Promise<LdapConnectionResult> {
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
      message:
        searchEntries.length > 0
          ? `Connection successful. Base DN "${config.baseDn}" is reachable.`
          : `Connected but base DN "${config.baseDn}" returned no results.`,
    }
  } catch (err: unknown) {
    try {
      await client.unbind()
    } catch {
      /* ignore unbind errors */
    }
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
  config?: LdapConfig
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
      attributes: ['dn', 'uid', 'sAMAccountName', 'mail', 'displayName', 'cn', 'memberOf'],
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
      try {
        await userClient.unbind()
      } catch {
        /* ignore */
      }
      return null // Invalid credentials
    }

    // Extract user information
    const resolvedUsername =
      extractStringAttr(entry, 'sAMAccountName') ?? extractStringAttr(entry, 'uid') ?? username

    const email = extractStringAttr(entry, 'mail')
    const displayName = extractStringAttr(entry, 'displayName') ?? extractStringAttr(entry, 'cn')

    const memberOf = extractStringArrayAttr(entry, 'memberOf')

    return {
      username: resolvedUsername,
      email,
      displayName,
      groups: memberOf,
    }
  } catch (err: unknown) {
    try {
      await serviceClient.unbind()
    } catch {
      /* ignore */
    }
    const message = err instanceof Error ? err.message : 'Unknown LDAP error'
    throw new Error(`LDAP authentication error: ${message}`)
  }
}
