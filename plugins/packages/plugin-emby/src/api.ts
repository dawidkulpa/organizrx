import { Hono } from 'hono'
import type { PluginAPI } from '@organizrx/plugin-sdk'
import type { EmbySession, EmbyItem, EmbyUser } from './types'

export function createAPI(pluginAPI: PluginAPI) {
  const app = new Hono()

  // Helper to get Emby URL and API key from settings
  async function getEmbyConfig() {
    const url = await pluginAPI.settings.get('emby_url')
    const apiKey = await pluginAPI.settings.get('emby_api_key')

    if (!url || !apiKey) {
      throw new Error('Emby URL and API key must be configured')
    }

    return { url: url.replace(/\/$/, ''), apiKey }
  }

  // Helper to make Emby API requests
  async function embyFetch(endpoint: string) {
    const { url, apiKey } = await getEmbyConfig()
    const fullUrl = `${url}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${apiKey}`

    pluginAPI.logger.debug('Emby API request', {
      endpoint,
      fullUrl: fullUrl.replace(apiKey, '***'),
    })

    const response = await pluginAPI.http.fetch(fullUrl, {
      headers: {
        'X-Emby-Token': apiKey,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      pluginAPI.logger.error('Emby API error', {
        endpoint,
        status: response.status,
        statusText: response.statusText,
      })
      throw new Error(`Emby API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // GET /sessions - Active sessions
  app.get('/sessions', async (c) => {
    try {
      const sessions = (await embyFetch(
        '/Sessions?Fields=Overview,People,Genres,CriticRating,Studios,Taglines'
      )) as EmbySession[]

      // Filter to only active sessions (those with NowPlayingItem or Name)
      const activeSessions = sessions.filter((s) => s.NowPlayingItem || s.UserName)

      pluginAPI.logger.info('Retrieved Emby sessions', { count: activeSessions.length })

      return c.json({ data: activeSessions })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      pluginAPI.logger.error('Failed to fetch sessions', { error: message })
      return c.json({ error: { code: 'FETCH_ERROR', message } }, 500)
    }
  })

  // GET /latest - Recently added items
  app.get('/latest', async (c) => {
    try {
      const limit = c.req.query('limit') || '10'
      const limitNum = Number.parseInt(limit, 10)

      if (Number.isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
        return c.json(
          { error: { code: 'INVALID_LIMIT', message: 'Limit must be between 1 and 50' } },
          400
        )
      }

      // First, get users to find an admin user
      const users = (await embyFetch('/Users')) as EmbyUser[]
      const adminUser = users.find((u) => u.Policy?.IsAdministrator)

      if (!adminUser) {
        pluginAPI.logger.error('No admin user found in Emby')
        return c.json({ error: { code: 'NO_ADMIN_USER', message: 'No admin user found' } }, 500)
      }

      // Get latest items for the admin user
      const items = (await embyFetch(
        `/Users/${adminUser.Id}/Items/Latest?EnableImages=true&Limit=${limitNum}&IsPlayed=false&Fields=Overview,People,Genres,CriticRating,Studios,Taglines&IncludeItemTypes=Series,Episode,MusicAlbum,Audio,Movie,Video`
      )) as EmbyItem[]

      pluginAPI.logger.info('Retrieved latest Emby items', {
        count: items.length,
        userId: adminUser.Id,
      })

      return c.json({ data: items })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      pluginAPI.logger.error('Failed to fetch latest items', { error: message })
      return c.json({ error: { code: 'FETCH_ERROR', message } }, 500)
    }
  })

  // GET /items/:id - Single item metadata
  app.get('/items/:id', async (c) => {
    try {
      const itemId = c.req.param('id')

      if (!itemId) {
        return c.json({ error: { code: 'INVALID_ID', message: 'Item ID is required' } }, 400)
      }

      // First, get users to find an admin user
      const users = (await embyFetch('/Users')) as EmbyUser[]
      const adminUser = users.find((u) => u.Policy?.IsAdministrator)

      if (!adminUser) {
        pluginAPI.logger.error('No admin user found in Emby')
        return c.json({ error: { code: 'NO_ADMIN_USER', message: 'No admin user found' } }, 500)
      }

      // Get item metadata
      const item = (await embyFetch(
        `/Users/${adminUser.Id}/Items/${itemId}?EnableImages=true&Fields=Overview,People,Genres,CriticRating,Studios,Taglines`
      )) as EmbyItem

      pluginAPI.logger.info('Retrieved Emby item', { itemId, userId: adminUser.Id })

      return c.json({ data: item })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      pluginAPI.logger.error('Failed to fetch item', { error: message })
      return c.json({ error: { code: 'FETCH_ERROR', message } }, 500)
    }
  })

  return app
}
