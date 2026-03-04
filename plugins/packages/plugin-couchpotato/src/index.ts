import type { OrganizrPlugin, PluginAPI, WidgetDefinition } from '@organizrx/plugin-sdk'

const plugin: OrganizrPlugin = {
  manifest: {
    name: 'CouchPotato',
    id: 'couchpotato',
    version: '0.0.1',
    description: 'CouchPotato movie download manager integration',
    author: 'OrganizrX',
    homepage: true,
    configurable: true,
    permissions: ['settings:read', 'http:external'],
  },

  async onLoad(api: PluginAPI) {
    api.logger.info('CouchPotato plugin loaded (stub)')
  },

  async onUnload() {},

  getWidgets(): WidgetDefinition[] {
    return [
      {
        id: 'couchpotato-status',
        name: 'CouchPotato Status',
        description: 'Coming Soon — displays wanted movies and download status',
        defaultSize: { w: 2, h: 1 },
        minSize: { w: 1, h: 1 },
        maxSize: { w: 4, h: 2 },
      },
    ]
  },
}

export default plugin
