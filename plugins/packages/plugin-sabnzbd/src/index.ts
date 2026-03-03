import type { OrganizrPlugin, PluginAPI, WidgetDefinition } from '@organizrx/plugin-sdk'
import { createApiRoutes } from './api'

let apiInstance: PluginAPI

const plugin: OrganizrPlugin = {
  manifest: {
    name: 'SABnzbd',
    id: 'sabnzbd',
    version: '1.0.0',
    description: 'SABnzbd integration for OrganizrX',
    author: 'OrganizrX',
    homepage: true,
    configurable: true,
  },
  async onLoad(api: PluginAPI) {
    apiInstance = api
    api.logger.info('SABnzbd plugin loaded')
  },
  async onUnload() {
    // cleanup
  },
  getRoutes() {
    return createApiRoutes(apiInstance)
  },
  getWidgets(): WidgetDefinition[] {
    return [
      {
        id: 'sabnzbd-queue',
        name: 'SABnzbd Queue',
        defaultSize: { w: 2, h: 2 },
        minSize: { w: 1, h: 1 },
        maxSize: { w: 4, h: 4 },
        description: 'Monitor SABnzbd download queue and history',
      },
    ]
  },
}

export default plugin
