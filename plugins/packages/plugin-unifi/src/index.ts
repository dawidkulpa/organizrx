import type { OrganizrPlugin, PluginAPI, WidgetDefinition } from '@organizrx/plugin-sdk'

const plugin: OrganizrPlugin = {
  manifest: {
    name: 'UniFi',
    id: 'unifi',
    version: '0.0.1',
    description: 'UniFi Controller network management integration',
    author: 'OrganizrX',
    homepage: true,
    configurable: true,
    permissions: ['settings:read', 'http:external'],
  },

  async onLoad(api: PluginAPI) {
    api.logger.info('UniFi plugin loaded (stub)')
  },

  async onUnload() {},

  getWidgets(): WidgetDefinition[] {
    return [
      {
        id: 'unifi-status',
        name: 'UniFi Status',
        description: 'Coming Soon — displays network device status and client information',
        defaultSize: { w: 2, h: 1 },
        minSize: { w: 1, h: 1 },
        maxSize: { w: 4, h: 2 },
      },
    ]
  },
}

export default plugin
