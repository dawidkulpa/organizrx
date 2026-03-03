import type { OrganizrPlugin, PluginAPI } from '@organizrx/plugin-sdk'

const plugin: OrganizrPlugin = {
  manifest: {
    name: '__PLUGIN_NAME__',
    id: '__PLUGIN_ID__',
    version: '0.0.1',
    description: '__PLUGIN_NAME__ integration for OrganizrX',
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
