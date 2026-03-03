import type { OrganizrPlugin, PluginAPI, WidgetDefinition } from '@organizrx/plugin-sdk'
import { createOverseerrAPI } from './api'
import { OverseerrRequestsWidget } from './widget'

let api: PluginAPI

const plugin: OrganizrPlugin = {
  manifest: {
    name: 'Overseerr',
    id: 'overseerr',
    version: '1.0.0',
    description: 'Overseerr media request integration for OrganizrX',
    author: 'OrganizrX',
    homepage: true,
    configurable: true,
    permissions: ['settings:read', 'http:external'],
  },

  async onLoad(pluginApi: PluginAPI) {
    api = pluginApi
    api.logger.info('Overseerr plugin loaded')
  },

  async onUnload() {
    api.logger.info('Overseerr plugin unloaded')
  },

  getRoutes() {
    return createOverseerrAPI(api)
  },

  getWidgets(): WidgetDefinition[] {
    return [
      {
        id: 'overseerr-requests',
        name: 'Overseerr Requests',
        description: 'Display pending Overseerr media requests',
        defaultSize: { w: 2, h: 2 },
        minSize: { w: 1, h: 1 },
        maxSize: { w: 4, h: 4 },
      },
    ]
  },
}

export default plugin
export { OverseerrRequestsWidget }
