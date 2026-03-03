import type { OrganizrPlugin, PluginAPI, WidgetDefinition } from '@organizrx/plugin-sdk'
import { createJellyfinAPI } from './api'
import { JellyfinSessionsWidget, JellyfinRecentWidget } from './widget'

const plugin: OrganizrPlugin = {
  manifest: {
    name: 'Jellyfin',
    id: 'jellyfin',
    version: '1.0.0',
    description: 'Jellyfin media server integration — active sessions, recently added media',
    author: 'OrganizrX',
    homepage: true,
    configurable: true,
    permissions: ['settings:read', 'http:external'],
  },

  async onLoad(api: PluginAPI) {
    api.logger.info('Jellyfin plugin loaded')
  },

  async onUnload() {
    // No cleanup required
  },

  getRoutes() {
    return createJellyfinAPI
  },

  getWidgets(): WidgetDefinition[] {
    return [
      {
        id: 'jellyfin-sessions',
        name: 'Jellyfin Sessions',
        description: 'Active playback sessions and streams',
        defaultSize: { w: 2, h: 2 },
        minSize: { w: 1, h: 1 },
        maxSize: { w: 4, h: 4 },
      },
      {
        id: 'jellyfin-recent',
        name: 'Jellyfin Recent',
        description: 'Recently added media items',
        defaultSize: { w: 2, h: 1 },
        minSize: { w: 2, h: 1 },
        maxSize: { w: 4, h: 3 },
      },
    ]
  },
}

export default plugin
export default plugin
export { JellyfinSessionsWidget, JellyfinRecentWidget }
export * from './shared'
export * from './types'
export * from './shared'
