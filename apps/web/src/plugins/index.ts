// Plugin widget mounting system and data bridge
export {
  registerWidget,
  unregisterWidget,
  getRegisteredWidgets,
  getWidgetsByPlugin,
  discoverWidgets,
  _resetRegistry,
} from './widget-registry'
export type {
  WidgetSize,
  WidgetProps,
  PluginWidgetRegistration,
} from './widget-registry'

export { createWidgetAPI } from './widget-api'
export type { PluginWidgetAPI } from './widget-api'

export { WidgetErrorBoundary } from './WidgetErrorBoundary'
export { PluginWidget } from './PluginWidget'
