import { Suspense, useMemo } from 'react'
import type { PluginWidgetRegistration, WidgetSize } from './widget-registry'
import { createWidgetAPI } from './widget-api'
import { WidgetErrorBoundary } from './WidgetErrorBoundary'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PluginWidgetProps {
  registration: PluginWidgetRegistration
  size: WidgetSize
}

// ---------------------------------------------------------------------------
// Loading placeholder
// ---------------------------------------------------------------------------

function WidgetLoadingPlaceholder({ name }: { name: string }) {
  return (
    <div className="flex h-full w-full animate-pulse items-center justify-center rounded-lg border border-border bg-muted p-6">
      <p className="text-sm text-muted-foreground">Loading {name}...</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PluginWidget container
// ---------------------------------------------------------------------------

/**
 * Wraps a registered plugin widget with error boundary and Suspense.
 * Creates a scoped PluginWidgetAPI and passes it as a prop to the widget.
 */
export function PluginWidget({ registration, size }: PluginWidgetProps) {
  const api = useMemo(
    () => createWidgetAPI(registration.pluginId),
    [registration.pluginId],
  )

  const WidgetComponent = registration.component

  return (
    <WidgetErrorBoundary widgetName={registration.name}>
      <Suspense fallback={<WidgetLoadingPlaceholder name={registration.name} />}>
        <WidgetComponent
          pluginId={registration.pluginId}
          widgetId={registration.widgetId}
          size={size}
          api={api}
        />
      </Suspense>
    </WidgetErrorBoundary>
  )
}
