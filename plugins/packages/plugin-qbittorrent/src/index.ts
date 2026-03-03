import type { OrganizrPlugin, PluginAPI, WidgetDefinition } from '@organizrx/plugin-sdk'
import { createApiRoutes } from './api'

let pluginApi: PluginAPI

  const plugin: OrganizrPlugin = {
  manifest: {
    name: 'qBittorrent',
    id: 'qbittorrent',
    version: '1.0.0',
    description: 'qBittorrent integration for OrganizrX',
    author: 'OrganizrX',
    homepage: true,
    configurable: true,
  },
  async onLoad(api: PluginAPI) {
    pluginApi = api
    api.logger.info('qBittorrent plugin loaded')
  },
  async onUnload() {
    // cleanup
  },
  getRoutes() {
    return createApiRoutes(pluginApi)
  },
  getWidgets(): WidgetDefinition[] {
    return [
      {
        id: 'qbittorrent-torrents',
        name: 'qBittorrent Torrents',
        defaultSize: { w: 2, h: 2 },
        minSize: { w: 1, h: 1 },
        maxSize: { w: 4, h: 4 },
        description: 'Monitor qBittorrent torrents with progress, speed, and controls',
      },
    ]
  },
}

export default plugin
