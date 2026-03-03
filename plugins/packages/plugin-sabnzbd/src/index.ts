import type { OrganizrPlugin, PluginAPI } from '@organizrx/plugin-sdk'

const plugin: OrganizrPlugin = {
  manifest: {
    name: 'SABnzbd',
    id: 'sabnzbd',
    version: '0.0.1',
    description: 'SABnzbd integration for OrganizrX',
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
