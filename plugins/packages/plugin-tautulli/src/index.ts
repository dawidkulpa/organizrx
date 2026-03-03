import type { OrganizrPlugin, PluginAPI } from '@organizrx/plugin-sdk'
import { createTautulliAPI } from './api'
import { TautulliActivityWidget, TautulliHistoryWidget } from './widget'

const plugin: OrganizrPlugin = {
  manifest: {
    name: 'Tautulli',
    id: 'tautulli',
    version: '1.0.0',
    description: 'Monitor Plex activity and viewing history via Tautulli',
    author: 'OrganizrX',
    homepage: true,
    configurable: true,
    permissions: ['http:external', 'settings:read', 'settings:write'],
  },

  async onLoad(api: PluginAPI) {
    api.logger.info('Tautulli plugin loaded')
  },

  async onUnload() {
    // cleanup if needed
  },

  getRoutes() {
    // Return a factory function that accepts the PluginAPI
    return (api: PluginAPI) => createTautulliAPI(api)
  },

  getWidgets() {
    return [
      {
        id: 'tautulli-activity',
        name: 'Tautulli Activity',
        description: 'View current Plex streams and watching activity',
        defaultSize: { w: 2, h: 2 },
        minSize: { w: 1, h: 1 },
        maxSize: { w: 4, h: 4 },
      },
      {
        id: 'tautulli-history',
        name: 'Tautulli History',
        description: 'View recently watched media from Plex',
        defaultSize: { w: 2, h: 1 },
        minSize: { w: 1, h: 1 },
        maxSize: { w: 4, h: 3 },
      },
    ]
  },
}

export default plugin
export { TautulliActivityWidget, TautulliHistoryWidget }
