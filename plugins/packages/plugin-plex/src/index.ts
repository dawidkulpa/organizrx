import type { OrganizrPlugin, PluginAPI, WidgetDefinition } from '@organizrx/plugin-sdk'
import { createPlexAPI } from './api'

let pluginAPI: PluginAPI

const plugin: OrganizrPlugin = {
  manifest: {
    name: 'Plex',
    id: 'plex',
    version: '1.0.0',
    description: 'Plex Media Server integration - streams, recent media, playlists, and search',
    author: 'OrganizrX',
    minAppVersion: '1.0.0',
    permissions: ['settings:read', 'settings:write', 'http:external'],
    homepage: true,
    configurable: true,
  },

  async onLoad(api: PluginAPI) {
    pluginAPI = api
    api.logger.info('Plex plugin loaded', { version: plugin.manifest.version })
  },

  async onUnload() {
    pluginAPI?.logger.info('Plex plugin unloaded')
  },

  getRoutes() {
    if (!pluginAPI) {
      throw new Error('Plugin API not initialized')
    }
    return createPlexAPI(pluginAPI)
  },

  getWidgets(): WidgetDefinition[] {
    return [
      {
        id: 'plex-streams',
        name: 'Plex Streams',
        description: 'Display active Plex streams with user information and progress',
        defaultSize: { w: 2, h: 2 },
        minSize: { w: 1, h: 1 },
        maxSize: { w: 4, h: 4 },
      },
      {
        id: 'plex-recent',
        name: 'Plex Recent',
        description: 'Show recently added movies, TV shows, and music',
        defaultSize: { w: 2, h: 1 },
        minSize: { w: 1, h: 1 },
        maxSize: { w: 4, h: 3 },
      },
      {
        id: 'plex-playlists',
        name: 'Plex Playlists',
        description: 'Browse and display Plex playlists',
        defaultSize: { w: 2, h: 2 },
        minSize: { w: 1, h: 1 },
        maxSize: { w: 4, h: 4 },
      },
    ]
  },
}

export default plugin
