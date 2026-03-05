export { PLUGIN_PACKAGE_PATTERN, validatePluginName } from './validation'

export type { AvailablePlugin } from './npm-client'
export { searchAvailablePlugins, getPluginInfo } from './npm-client'

export type { InstalledPlugin } from './installed'
export { getInstalledPlugins } from './installed'

export type { RegistryCommandResult } from './installer'
export {
  installPlugin,
  removePlugin,
  updatePlugin,
  getNeedsRestart,
  clearNeedsRestart,
  _resetRegistry,
} from './installer'
