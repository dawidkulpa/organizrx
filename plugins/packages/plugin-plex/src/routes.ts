import type { PluginAPI } from '@organizrx/plugin-sdk'
import type { PluginAPI } from '@organizrx/plugin-sdk'
import type { PlexMediaContainer, ResolvedPlexItem } from './types'
import type { PlexAPIResponse } from './types'
import {
  StreamsQuerySchema,
  RecentQuerySchema,
  SearchQuerySchema,
  MetadataParamsSchema,
} from './schemas'
import { plexRequest, getPlexConfig, resolvePlexItem } from './helpers'

// GET /streams - Active streams
export async function handleStreams(c: any, api: PluginAPI) {
  try {
    const query = StreamsQuerySchema.parse(c.req.query())
    const exclude = query.exclude ? query.exclude.split(',') : []

    const response = await plexRequest(api, '/status/sessions')
    const xmlText = await response.text()

    const items: ResolvedPlexItem[] = []
    const { machineId } = await getPlexConfig(api)

    const data = JSON.parse(xmlText) as PlexMediaContainer

    if (data.MediaContainer.Video) {
      for (const video of data.MediaContainer.Video) {
        if (!exclude.includes(video.librarySectionID)) {
          items.push(resolvePlexItem(video, machineId))
        }
      }
    }

    api.logger.info('Fetched active streams', { count: items.length })

    return c.json<PlexAPIResponse<ResolvedPlexItem[]>>({ data: items })
  } catch (error) {
    api.logger.error('Failed to fetch streams', { error })
    return c.json(
      { error: { code: 'FETCH_FAILED', message: 'Failed to fetch active streams' } },
      500
    )
  }
}

// GET /recent - Recently added media
export async function handleRecent(c: any, api: PluginAPI) {
  try {
    const query = RecentQuerySchema.parse(c.req.query())
    const exclude = query.exclude ? query.exclude.split(',') : []
    const limit = query.limit

    const types = [
      { type: 1, name: 'movie' },
      { type: 2, name: 'tv' },
      { type: 8, name: 'music' },
    ]

    const allItems: ResolvedPlexItem[] = []
    const { machineId } = await getPlexConfig(api)

    for (const { type } of types) {
      const endpoint = `/hubs/home/recentlyAdded?X-Plex-Container-Start=0&X-Plex-Container-Size=${limit}&type=${type}`
      const response = await plexRequest(api, endpoint)
      const xmlText = await response.text()
      const data = JSON.parse(xmlText) as PlexMediaContainer

      if (data.MediaContainer.Video) {
        for (const video of data.MediaContainer.Video) {
          if (!exclude.includes(video.librarySectionID)) {
            allItems.push(resolvePlexItem(video, machineId))
          }
        }
      }

      if (data.MediaContainer.Track) {
        for (const track of data.MediaContainer.Track) {
          if (!exclude.includes(track.librarySectionID)) {
            allItems.push(resolvePlexItem(track, machineId))
          }
        }
      }
    }

    // Sort by addedAt descending
    allItems.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))

    api.logger.info('Fetched recent items', { count: allItems.length })

    return c.json<PlexAPIResponse<ResolvedPlexItem[]>>({ data: allItems })
  } catch (error) {
    api.logger.error('Failed to fetch recent items', { error })
    return c.json({ error: { code: 'FETCH_FAILED', message: 'Failed to fetch recent items' } }, 500)
  }
}

// GET /playlists - User playlists
export async function handlePlaylists(c: any, api: PluginAPI) {
  try {
    const response = await plexRequest(api, '/playlists')
    const xmlText = await response.text()
    const data = JSON.parse(xmlText) as { MediaContainer: { Playlist: any[] } }

    const playlists: Record<string, { title: string; items: ResolvedPlexItem[] }> = {}
    const { machineId } = await getPlexConfig(api)

    if (data.MediaContainer.Playlist) {
      for (const playlist of data.MediaContainer.Playlist) {
        if (
          playlist.playlistType === 'video' &&
          !playlist.title.toLowerCase().includes('private')
        ) {
          const cleanTitle = playlist.title.replace(/\W+/g, '')
          const playlistResponse = await plexRequest(api, playlist.key)
          const playlistXml = await playlistResponse.text()
          const playlistData = JSON.parse(playlistXml) as PlexMediaContainer

          playlists[cleanTitle] = {
            title: playlist.title,
            items: [],
          }

          if (playlistData.MediaContainer.Video) {
            for (const video of playlistData.MediaContainer.Video) {
              playlists[cleanTitle].items.push(resolvePlexItem(video, machineId))
            }
          }
        }
      }
    }

    api.logger.info('Fetched playlists', { count: Object.keys(playlists).length })

    return c.json<PlexAPIResponse<typeof playlists>>({ data: playlists })
  } catch (error) {
    api.logger.error('Failed to fetch playlists', { error })
    return c.json({ error: { code: 'FETCH_FAILED', message: 'Failed to fetch playlists' } }, 500)
  }
}

// GET /search?q=query - Search media
export async function handleSearch(c: any, api: PluginAPI) {
  try {
    const query = SearchQuerySchema.parse(c.req.query())
    const exclude = query.exclude ? query.exclude.split(',') : []
    const searchQuery = encodeURIComponent(query.q)

    const response = await plexRequest(api, `/search?query=${searchQuery}`)
    const xmlText = await response.text()
    const data = JSON.parse(xmlText) as PlexMediaContainer

    const items: ResolvedPlexItem[] = []
    const { machineId } = await getPlexConfig(api)
    const ignoreTypes = ['artist', 'episode']

    if (data.MediaContainer.Video) {
      for (const video of data.MediaContainer.Video) {
        if (!ignoreTypes.includes(video.type) && !exclude.includes(video.librarySectionID)) {
          items.push(resolvePlexItem(video, machineId))
        }
      }
    }

    api.logger.info('Search completed', { query: query.q, count: items.length })

    return c.json<PlexAPIResponse<ResolvedPlexItem[]>>({ data: items })
  } catch (error) {
    api.logger.error('Search failed', { error })
    return c.json({ error: { code: 'SEARCH_FAILED', message: 'Failed to search media' } }, 500)
  }
}

// GET /metadata/:id - Get metadata for specific item
export async function handleMetadata(c: any, api: PluginAPI) {
  try {
    const params = MetadataParamsSchema.parse(c.req.param())

    const response = await plexRequest(api, `/library/metadata/${params.id}`)
    const xmlText = await response.text()
    const data = JSON.parse(xmlText) as PlexMediaContainer

    const items: ResolvedPlexItem[] = []
    const { machineId } = await getPlexConfig(api)

    if (data.MediaContainer.Video) {
      for (const video of data.MediaContainer.Video) {
        items.push(resolvePlexItem(video, machineId))
      }
    }

    if (items.length === 0) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Item not found' } }, 404)
    }

    api.logger.info('Fetched metadata', { id: params.id })

    return c.json<PlexAPIResponse<ResolvedPlexItem>>({ data: items[0] })
  } catch (error) {
    api.logger.error('Failed to fetch metadata', { error })
    return c.json({ error: { code: 'FETCH_FAILED', message: 'Failed to fetch metadata' } }, 500)
  }
}

// Register all routes
export function registerRoutes(app: any, api: PluginAPI) {
  app.get('/streams', (c: any) => handleStreams(c, api))
  app.get('/recent', (c: any) => handleRecent(c, api))
  app.get('/playlists', (c: any) => handlePlaylists(c, api))
  app.get('/search', (c: any) => handleSearch(c, api))
  app.get('/metadata/:id', (c: any) => handleMetadata(c, api))
}
