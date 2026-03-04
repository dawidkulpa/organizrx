import type { OrganizrPlugin, PluginAPI, WidgetDefinition } from '@organizrx/plugin-sdk'

const plugin: OrganizrPlugin = {
  manifest: {
    name: 'Deluge',
    id: 'deluge',
    version: '0.0.1',
    description: 'Deluge BitTorrent client integration',
    author: 'OrganizrX',
    homepage: true,
    configurable: true,
    permissions: ['settings:read', 'http:external'],
  },

  async onLoad(api: PluginAPI) {
    api.logger.info('Deluge plugin loaded (stub)')
  },

  async onUnload() {},

  getWidgets(): WidgetDefinition[] {
    return [
      {
        id: 'deluge-status',
        name: 'Deluge Status',
        description: 'Coming Soon — displays active torrents and transfer speeds',
        defaultSize: { w: 2, h: 1 },
        minSize: { w: 1, h: 1 },
        maxSize: { w: 4, h: 2 },
      },
    ]
  },
}

export default plugin
