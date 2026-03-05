import { getSettingBoolean, getSettingNumber } from '../settings'
import { getSetting } from '../settings'

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
