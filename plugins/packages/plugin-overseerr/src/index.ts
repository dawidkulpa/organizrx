import type { OrganizrPlugin, PluginAPI } from '@organizrx/plugin-sdk'

const plugin: OrganizrPlugin = {
  manifest: {
    name: 'Overseerr',
    id: 'overseerr',
    version: '0.0.1',
    description: 'Overseerr integration for OrganizrX',
    author: 'OrganizrX',
    homepage: true,
    configurable: true,
  },
  async onLoad(api: PluginAPI) {
    api.logger.info('Plugin loaded')
  },
  async onUnload() {
    // cleanup
  },
}

export default plugin
