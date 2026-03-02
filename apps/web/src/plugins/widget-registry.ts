import { lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'
import type { PluginWidgetAPI } from './widget-api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WidgetSize {
  w: number
  h: number
}

export interface WidgetProps {
  pluginId: string
  widgetId: string
  size: WidgetSize
  api: PluginWidgetAPI
}

export interface PluginWidgetRegistration {
  pluginId: string
  widgetId: string
  name: string
  defaultSize: WidgetSize
  minSize?: WidgetSize
  maxSize?: WidgetSize
  description?: string
  component: LazyExoticComponent<ComponentType<WidgetProps>>
}

// ---------------------------------------------------------------------------
// Server response types
// ---------------------------------------------------------------------------

interface PluginWidgetDefinition {
  id: string
  name: string
  defaultSize: WidgetSize
  minSize?: WidgetSize
  maxSize?: WidgetSize
  description?: string
}

interface DiscoveredPlugin {
  id: string
  name: string
  version: string
  widgets?: PluginWidgetDefinition[]
}

interface PluginsApiResponse {
  data: DiscoveredPlugin[]
}

// ---------------------------------------------------------------------------
// Registry state
// ---------------------------------------------------------------------------

const registry = new Map<string, PluginWidgetRegistration>()

function makeKey(pluginId: string, widgetId: string): string {
  return `${pluginId}::${widgetId}`
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a widget in the frontend registry.
 */
export function registerWidget(registration: PluginWidgetRegistration): void {
  const key = makeKey(registration.pluginId, registration.widgetId)
  registry.set(key, registration)
}

/**
 * Remove a widget from the registry.
 */
export function unregisterWidget(pluginId: string, widgetId: string): void {
  const key = makeKey(pluginId, widgetId)
  registry.delete(key)
}

/**
 * Return all registered widgets.
 */
export function getRegisteredWidgets(): PluginWidgetRegistration[] {
  return [...registry.values()]
}

/**
 * Return widgets for a specific plugin.
 */
export function getWidgetsByPlugin(pluginId: string): PluginWidgetRegistration[] {
  return [...registry.values()].filter((w) => w.pluginId === pluginId)
}

/**
 * Fetch installed plugins from the server and register their widget definitions.
 * Widgets are lazy-loaded from `@organizrx/plugin-{pluginId}/widgets/{widgetId}`.
 */
export async function discoverWidgets(): Promise<PluginWidgetRegistration[]> {
  const response = await fetch('/api/plugins')

  if (!response.ok) {
    throw new Error(`Failed to discover plugins: ${response.status} ${response.statusText}`)
  }

  const body = (await response.json()) as PluginsApiResponse
  const discovered: PluginWidgetRegistration[] = []

  for (const plugin of body.data) {
    if (!plugin.widgets || plugin.widgets.length === 0) continue

    for (const widget of plugin.widgets) {
      const registration: PluginWidgetRegistration = {
        pluginId: plugin.id,
        widgetId: widget.id,
        name: widget.name,
        defaultSize: widget.defaultSize,
        minSize: widget.minSize,
        maxSize: widget.maxSize,
        description: widget.description,
        component: lazy(
          () => import(`@organizrx/plugin-${plugin.id}/widgets/${widget.id}`),
        ),
      }

      registerWidget(registration)
      discovered.push(registration)
    }
  }

  return discovered
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Clear all registered widgets (for testing only) */
export function _resetRegistry(): void {
  registry.clear()
}
