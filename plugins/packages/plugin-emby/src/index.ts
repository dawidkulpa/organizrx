import type { OrganizrPlugin, PluginAPI, WidgetDefinition } from '@organizrx/plugin-sdk'
import { createAPI } from './api'
import { EmbySessionsWidget, EmbyRecentWidget } from './widget'

const plugin: OrganizrPlugin = {
  manifest: {
    name: 'Emby',
    id: 'emby',
    version: '1.0.0',
    description: 'Emby media server integration — active sessions and recently added media',
    author: 'OrganizrX',
    homepage: true,
    configurable: true,
    permissions: ['http:external', 'settings:read'],
  },
  async onLoad(api: PluginAPI) {
    api.logger.info('Emby plugin loaded')
  },
  async onUnload() {
    // Cleanup if needed
  },
  getRoutes() {
    return createAPI
  },
  getWidgets(): WidgetDefinition[] {
    return [
      {
        id: 'emby-sessions',
        name: 'Emby Sessions',
        description: 'Active Emby playback sessions with progress and transcode status',
        defaultSize: { w: 2, h: 2 },
        minSize: { w: 1, h: 1 },
      },
      {
        id: 'emby-recent',
        name: 'Emby Recent',
        description: 'Recently added media from Emby library',
        defaultSize: { w: 2, h: 1 },
        minSize: { w: 1, h: 1 },
      },
    ]
  },
}

export default plugin
export { EmbySessionsWidget, EmbyRecentWidget }
