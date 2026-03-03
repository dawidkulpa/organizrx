import type { OrganizrPlugin, PluginAPI, WidgetDefinition } from '@organizrx/plugin-sdk'
import { createRadarrAPI } from './api'
import { RadarrCalendarWidget, RadarrQueueWidget } from './widget'

let apiInstance: ReturnType<typeof createRadarrAPI> | null = null

const plugin: OrganizrPlugin = {
  manifest: {
    name: 'Radarr',
    id: 'radarr',
    version: '1.0.0',
    description: 'Radarr integration for OrganizrX — movie calendar, download queue, and more',
    author: 'OrganizrX',
    homepage: true,
    configurable: true,
    permissions: ['settings:read', 'http:external'],
  },

  async onLoad(api: PluginAPI) {
    api.logger.info('Radarr plugin loaded')
    apiInstance = createRadarrAPI(api)
  },

  async onUnload() {
    apiInstance = null
  },

  getRoutes() {
    if (!apiInstance) {
      throw new Error('Radarr plugin not initialized')
    }
    return apiInstance
  },

  getWidgets(): WidgetDefinition[] {
    return [
      {
        id: 'radarr-calendar',
        name: 'Radarr Calendar',
        description: 'Upcoming movie releases',
        defaultSize: { w: 2, h: 2 },
        minSize: { w: 1, h: 1 },
        maxSize: { w: 4, h: 4 },
      },
      {
        id: 'radarr-queue',
        name: 'Radarr Queue',
        description: 'Active movie downloads',
        defaultSize: { w: 2, h: 1 },
        minSize: { w: 1, h: 1 },
        maxSize: { w: 4, h: 3 },
      },
    ]
  },
}

export default plugin
export { RadarrCalendarWidget, RadarrQueueWidget }
