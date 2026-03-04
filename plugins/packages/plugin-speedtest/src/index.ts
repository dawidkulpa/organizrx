import type { OrganizrPlugin, PluginAPI, WidgetDefinition } from '@organizrx/plugin-sdk'

const plugin: OrganizrPlugin = {
  manifest: {
    name: 'Speedtest',
    id: 'speedtest',
    version: '0.0.1',
    description: 'Speedtest Tracker internet speed monitoring integration',
    author: 'OrganizrX',
    homepage: true,
    configurable: true,
    permissions: ['settings:read', 'http:external'],
  },

  async onLoad(api: PluginAPI) {
    api.logger.info('Speedtest plugin loaded (stub)')
  },

  async onUnload() {},

  getWidgets(): WidgetDefinition[] {
    return [
      {
        id: 'speedtest-status',
        name: 'Speedtest Status',
        description: 'Coming Soon — displays internet speed test results and history',
        defaultSize: { w: 2, h: 1 },
        minSize: { w: 1, h: 1 },
        maxSize: { w: 4, h: 2 },
      },
    ]
  },
}

export default plugin
