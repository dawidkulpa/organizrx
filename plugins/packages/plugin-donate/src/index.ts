import type { OrganizrPlugin, PluginAPI, WidgetDefinition } from '@organizrx/plugin-sdk'

const plugin: OrganizrPlugin = {
  manifest: {
    name: 'Donate',
    id: 'donate',
    version: '0.0.1',
    description: 'Donation widget with Stripe/PayPal link support',
    author: 'OrganizrX',
    homepage: true,
    configurable: true,
    permissions: ['settings:read'],
  },

  async onLoad(api: PluginAPI) {
    api.logger.info('Donate plugin loaded (stub)')
  },

  async onUnload() {},

  getWidgets(): WidgetDefinition[] {
    return [
      {
        id: 'donate-status',
        name: 'Donate Status',
        description: 'Coming Soon — displays donation links and support information',
        defaultSize: { w: 2, h: 1 },
        minSize: { w: 1, h: 1 },
        maxSize: { w: 4, h: 2 },
      },
    ]
  },
}

export default plugin
