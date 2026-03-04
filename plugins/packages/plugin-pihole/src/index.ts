import type { OrganizrPlugin, PluginAPI, WidgetDefinition } from '@organizrx/plugin-sdk'

const plugin: OrganizrPlugin = {
  manifest: {
    name: 'Pi-hole',
    id: 'pihole',
    version: '0.0.1',
    description: 'Pi-hole DNS-level ad blocker integration',
    author: 'OrganizrX',
    homepage: true,
    configurable: true,
    permissions: ['settings:read', 'http:external'],
  },

  async onLoad(api: PluginAPI) {
    api.logger.info('Pi-hole plugin loaded (stub)')
  },

  async onUnload() {},

  getWidgets(): WidgetDefinition[] {
    return [
      {
        id: 'pihole-status',
        name: 'Pi-hole Status',
        description: 'Coming Soon — displays DNS query statistics and blocking status',
        defaultSize: { w: 2, h: 1 },
        minSize: { w: 1, h: 1 },
        maxSize: { w: 4, h: 2 },
      },
    ]
  },
}

export default plugin
