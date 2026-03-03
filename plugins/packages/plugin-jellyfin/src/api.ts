import { Hono } from 'hono'
import type { PluginAPI } from '@organizrx/plugin-sdk'
import {
  buildAuthHeaders,
  normalizeSession,
  normalizeMediaItem,
} from './shared'
import type { NormalizedSession, NormalizedMediaItem, SessionInfo, MediaItem } from './types'
import type { PluginAPI } from '@organizrx/plugin-sdk'
import {
  buildAuthHeaders,
  normalizeSession,
  normalizeMediaItem,
  type NormalizedSession,
  type NormalizedMediaItem,
  type SessionInfo,
  type MediaItem,
} from './shared'

export function createJellyfinAPI(api: PluginAPI) {
  const app = new Hono()

  // ---------------------------------------------------------------------------
  // GET /sessions — Active playback sessions
  // ---------------------------------------------------------------------------
  app.get('/sessions', async (c) => {
    try {
      const jellyfinUrl = await api.settings.get('jellyfin_url')
      const jellyfinApiKey = await api.settings.get('jellyfin_api_key')

      if (!jellyfinUrl || !jellyfinApiKey) {
        return c.json(
          { error: { code: 'CONFIG_MISSING', message: 'Jellyfin URL or API key not configured' } },
          422
        )
      }

      const url = `${jellyfinUrl}/Sessions?Fields=Overview,People,Genres,CriticRating,Studios,Taglines`
      const headers = buildAuthHeaders(jellyfinApiKey)

      const response = await api.http.fetch(url, { headers })

      if (!response.ok) {
        api.logger.error('Failed to fetch sessions', { status: response.status, url })
return c.json(
{ error: { code: 'JELLYFIN_ERROR', message: 'Failed to fetch sessions from Jellyfin' } },
          response.status as 500
)
      }

      const sessions: SessionInfo[] = await response.json()
      const activeSessions: NormalizedSession[] = sessions
        .map((session) => normalizeSession(session, jellyfinUrl))
        .filter((s): s is NormalizedSession => s !== null)

      api.logger.info('Fetched sessions', { count: activeSessions.length })

      return c.json({ data: activeSessions })
    } catch (error) {
      api.logger.error('Error in /sessions', { error: String(error) })
      return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, 500)
    }
  })

  // ---------------------------------------------------------------------------
  // GET /latest — Recently added media items
  // ---------------------------------------------------------------------------
  app.get('/latest', async (c) => {
    try {
      const jellyfinUrl = await api.settings.get('jellyfin_url')
      const jellyfinApiKey = await api.settings.get('jellyfin_api_key')
      const limit = await api.settings.getNumber('recent_limit', 10)

      if (!jellyfinUrl || !jellyfinApiKey) {
        return c.json(
          { error: { code: 'CONFIG_MISSING', message: 'Jellyfin URL or API key not configured' } },
          422
        )
      }

      // First, get admin user ID or first user
      const usersUrl = `${jellyfinUrl}/Users`
      const headers = buildAuthHeaders(jellyfinApiKey)

      const usersResponse = await api.http.fetch(usersUrl, { headers })

      if (!usersResponse.ok) {
        api.logger.error('Failed to fetch users', { status: usersResponse.status, url: usersUrl })
return c.json(
{ error: { code: 'JELLYFIN_ERROR', message: 'Failed to fetch users from Jellyfin' } },
          usersResponse.status as 500
)
      }

      const users: Array<{ Id: string; Policy?: { IsAdministrator?: boolean } }> =
        await usersResponse.json()
      const adminUser = users.find((u) => u.Policy?.IsAdministrator)
      const userId = adminUser?.Id || users[0]?.Id

      if (!userId) {
        api.logger.error('No users found in Jellyfin')
        return c.json({ error: { code: 'NO_USERS', message: 'No users found in Jellyfin' } }, 500)
      }

      // Fetch latest items for this user
      const latestUrl = `${jellyfinUrl}/Users/${userId}/Items/Latest?EnableImages=true&Limit=${limit}&IsPlayed=false&Fields=Overview,People,Genres,CriticRating,Studios,Taglines`
      const latestResponse = await api.http.fetch(latestUrl, { headers })

      if (!latestResponse.ok) {
        api.logger.error('Failed to fetch latest items', {
          status: latestResponse.status,
          url: latestUrl,
        })
        return c.json({ error: { code: 'JELLYFIN_ERROR', message: 'Failed to fetch latest items from Jellyfin' } }, latestResponse.status as 500)
      }

      const items: MediaItem[] = await latestResponse.json()
      const normalizedItems: NormalizedMediaItem[] = items
        .map((item) => normalizeMediaItem(item, jellyfinUrl))
        .filter((i): i is NormalizedMediaItem => i !== null)

      api.logger.info('Fetched latest items', { count: normalizedItems.length })

      return c.json({ data: normalizedItems })
    } catch (error) {
      api.logger.error('Error in /latest', { error: String(error) })
      return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, 500)
    }
  })

  // ---------------------------------------------------------------------------
  // GET /items/:id — Get detailed item metadata
  // ---------------------------------------------------------------------------
  app.get('/items/:id', async (c) => {
    try {
      const itemId = c.req.param('id')
      const jellyfinUrl = await api.settings.get('jellyfin_url')
      const jellyfinApiKey = await api.settings.get('jellyfin_api_key')

      if (!jellyfinUrl || !jellyfinApiKey) {
        return c.json(
          { error: { code: 'CONFIG_MISSING', message: 'Jellyfin URL or API key not configured' } },
          422
        )
      }

      // Get admin user ID or first user
      const usersUrl = `${jellyfinUrl}/Users`
      const headers = buildAuthHeaders(jellyfinApiKey)

      const usersResponse = await api.http.fetch(usersUrl, { headers })

      if (!usersResponse.ok) {
        api.logger.error('Failed to fetch users', { status: usersResponse.status, url: usersUrl })
return c.json(
{ error: { code: 'JELLYFIN_ERROR', message: 'Failed to fetch users from Jellyfin' } },
          usersResponse.status as 500
)
      }

      const users: Array<{ Id: string; Policy?: { IsAdministrator?: boolean } }> =
        await usersResponse.json()
      const adminUser = users.find((u) => u.Policy?.IsAdministrator)
      const userId = adminUser?.Id || users[0]?.Id

      if (!userId) {
        api.logger.error('No users found in Jellyfin')
        return c.json({ error: { code: 'NO_USERS', message: 'No users found in Jellyfin' } }, 500)
      }

      // Fetch item details
      const itemUrl = `${jellyfinUrl}/Users/${userId}/Items/${itemId}?Fields=Overview,People,Genres,CriticRating,Studios,Taglines`
      const itemResponse = await api.http.fetch(itemUrl, { headers })

      if (!itemResponse.ok) {
        api.logger.error('Failed to fetch item', {
          status: itemResponse.status,
          url: itemUrl,
          itemId,
        })
return c.json(
{ error: { code: 'JELLYFIN_ERROR', message: 'Failed to fetch item from Jellyfin' } },
          itemResponse.status as 500
)
      }

      const item: MediaItem = await itemResponse.json()
      const normalizedItem = normalizeMediaItem(item, jellyfinUrl)

      if (!normalizedItem) {
        return c.json({ error: { code: 'INVALID_ITEM', message: 'Could not normalize item' } }, 500)
      }

      api.logger.info('Fetched item details', { itemId })

      return c.json({ data: normalizedItem })
    } catch (error) {
      api.logger.error('Error in /items/:id', { error: String(error) })
      return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, 500)
    }
  })

  return app
}
