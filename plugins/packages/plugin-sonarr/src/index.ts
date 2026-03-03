import type { OrganizrPlugin, PluginAPI, WidgetDefinition } from '@organizrx/plugin-sdk'
import { createSonarrAPI } from './api'

const plugin: OrganizrPlugin = {
  manifest: {
    name: 'Sonarr',
    id: 'sonarr',
    version: '1.0.0',
    description: 'Sonarr TV series management integration with calendar and download queue widgets',
    author: 'OrganizrX',
    homepage: true,
    configurable: true,
    permissions: ['settings:read', 'http:external'],
  },

  async onLoad(api: PluginAPI) {
    api.logger.info('Sonarr plugin loaded', {
      version: this.manifest.version,
    })

    // Validate required settings
    const url = await api.settings.get('sonarr_url')
    const apiKey = await api.settings.get('sonarr_api_key')

    if (!url || !apiKey) {
      api.logger.warn('Sonarr plugin is missing required configuration', {
        hasUrl: !!url,
        hasApiKey: !!apiKey,
      })
    }
  },

  async onUnload() {
    // No cleanup needed
  },

  getRoutes() {
    // Return factory function that will be called with api
    return (api: PluginAPI) => createSonarrAPI(api)
  },

  getWidgets(): WidgetDefinition[] {
    return [
      {
        id: 'sonarr-calendar',
        name: 'Sonarr Calendar',
        description: 'Display upcoming TV episodes from Sonarr',
        defaultSize: { w: 2, h: 2 },
        minSize: { w: 1, h: 1 },
        maxSize: { w: 4, h: 4 },
      },
      {
        id: 'sonarr-queue',
        name: 'Sonarr Queue',
        description: 'Display active downloads from Sonarr',
        defaultSize: { w: 2, h: 1 },
        minSize: { w: 1, h: 1 },
        maxSize: { w: 4, h: 3 },
      },
    ]
  },
}

export default plugin
