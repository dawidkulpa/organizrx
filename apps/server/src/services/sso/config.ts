import { getSettingString, getSettingBoolean } from '../settings'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SsoServiceConfig {
  name: string
  enabled: boolean
  cookie_name: string
  cookie_domain: string
  cookie_path: string
  token_source: string
  description?: string
}

// ---------------------------------------------------------------------------
// Default SSO service configs
// ---------------------------------------------------------------------------

export const DEFAULT_SSO_SERVICES: Omit<SsoServiceConfig, 'enabled'>[] = [
  {
    name: 'plex',
    cookie_name: 'X-Plex-Token',
    cookie_domain: '',
    cookie_path: '/',
    token_source: 'plex_token',
    description: 'Plex Media Server',
  },
  {
    name: 'jellyfin',
    cookie_name: 'jellyfin_credentials',
    cookie_domain: '',
    cookie_path: '/',
    token_source: 'jellyfin_token',
    description: 'Jellyfin Media Server',
  },
  {
    name: 'emby',
    cookie_name: 'emby_token',
    cookie_domain: '',
    cookie_path: '/',
    token_source: 'emby_token',
    description: 'Emby Media Server',
  },
  {
    name: 'tautulli',
    cookie_name: 'tautulli_token',
    cookie_domain: '',
    cookie_path: '/',
    token_source: 'tautulli_token',
    description: 'Tautulli Statistics Tracker',
  },
  {
    name: 'overseerr',
    cookie_name: 'connect.sid',
    cookie_domain: '',
    cookie_path: '/',
    token_source: 'overseerr_token',
    description: 'Overseerr Request Manager',
  },
  {
    name: 'ombi',
    cookie_name: 'Auth',
    cookie_domain: '',
    cookie_path: '/',
    token_source: 'ombi_token',
    description: 'Ombi Request Manager',
  },
  {
    name: 'petio',
    cookie_name: 'petio_jwt',
    cookie_domain: '',
    cookie_path: '/',
    token_source: 'petio_token',
    description: 'Petio Request Manager',
  },
  {
    name: 'komga',
    cookie_name: 'komga_token',
    cookie_domain: '',
    cookie_path: '/',
    token_source: 'komga_token',
    description: 'Komga Comic/Manga Server',
  },
]

// ---------------------------------------------------------------------------
// SSO configuration
// ---------------------------------------------------------------------------

export async function getSsoConfig(): Promise<SsoServiceConfig[]> {
  const globalEnabled = await getSettingBoolean('sso_enabled', false)

  const configs: SsoServiceConfig[] = []
  for (const service of DEFAULT_SSO_SERVICES) {
    const enabled = globalEnabled && (await getSettingBoolean(`sso_${service.name}_enabled`, false))
    const cookie_name = await getSettingString(
      `sso_${service.name}_cookie_name`,
      service.cookie_name
    )
    const cookie_domain = await getSettingString(
      `sso_${service.name}_cookie_domain`,
      service.cookie_domain
    )
    const cookie_path = await getSettingString(
      `sso_${service.name}_cookie_path`,
      service.cookie_path
    )
    const token_source = await getSettingString(
      `sso_${service.name}_token_source`,
      service.token_source
    )

    configs.push({
      name: service.name,
      enabled,
      cookie_name,
      cookie_domain,
      cookie_path,
      token_source,
      description: service.description,
    })
  }

  return configs
}
