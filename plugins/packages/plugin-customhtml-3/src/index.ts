import type { OrganizrPlugin, PluginAPI, WidgetDefinition } from '@organizrx/plugin-sdk'

const plugin: OrganizrPlugin = {
  manifest: {
    name: 'Custom HTML 3',
    id: 'customhtml-3',
    version: '0.0.1',
    description: 'User-defined HTML/CSS/JS widget slot 3',
    author: 'OrganizrX',
    homepage: true,
    configurable: true,
    permissions: ['settings:read'],
  },

  async onLoad(api: PluginAPI) {
    api.logger.info('Custom HTML 3 plugin loaded (stub)')
  },

  async onUnload() {},

  getWidgets(): WidgetDefinition[] {
    return [
      {
        id: 'customhtml-3-status',
        name: 'Custom HTML 3 Status',
        description: 'Coming Soon — renders user-defined HTML content',
        defaultSize: { w: 2, h: 1 },
        minSize: { w: 1, h: 1 },
        maxSize: { w: 4, h: 2 },
      },
    ]
  },
}

export default plugin
