import React, { useMemo } from 'react'
import { Responsive, useContainerWidth } from 'react-grid-layout'
import type { LayoutItem } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { cn } from '../utils'
import { PluginWidget } from '../plugins/PluginWidget'
import { PluginWidgetRegistration } from '../plugins/widget-registry'
import { GripHorizontal } from 'lucide-react'

interface WidgetGridProps {
  widgets: PluginWidgetRegistration[]
  layout: LayoutItem[]
  onLayoutChange: (layout: LayoutItem[]) => void
}

export function WidgetGrid({ widgets, layout, onLayoutChange }: WidgetGridProps) {
  const { width, containerRef, mounted } = useContainerWidth()

  // Compute the active layout, merging prop layout with default positions for any new widgets
  const computedLayout = useMemo(() => {
    return widgets.map((widget, i) => {
      // Find existing layout item for this widget
      const existingItem = layout.find((l) => l.i === widget.widgetId)

      // If it exists, use it, but ensure we respect current min/max constraints from registration
      if (existingItem) {
        return {
          ...existingItem,
          minW: widget.minSize?.w ?? 2,
          minH: widget.minSize?.h ?? 2,
          maxW: widget.maxSize?.w,
          maxH: widget.maxSize?.h,
        }
      }

      // Default placement logic for new widgets
      // Distribute in a 4-column grid (lg)
      const col = (i * (widget.defaultSize.w)) % 4
      const row = Math.floor((i * (widget.defaultSize.w)) / 4) * (widget.defaultSize.h)

      return {
        i: widget.widgetId,
        x: col,
        y: row,
        w: widget.defaultSize.w,
        h: widget.defaultSize.h,
        minW: widget.minSize?.w ?? 2,
        minH: widget.minSize?.h ?? 2,
        maxW: widget.maxSize?.w,
        maxH: widget.maxSize?.h,
      }
    })
  }, [widgets, layout])

  // Handler for layout changes from RGL
  const handleLayoutChange = (currentLayout: readonly LayoutItem[]) => {
    onLayoutChange([...currentLayout])
  }

  return (
    <div ref={containerRef as React.RefObject<HTMLDivElement>}>
      {mounted && (
        <Responsive
          width={width}
          className="layout"
          layouts={{ lg: computedLayout, md: computedLayout, sm: computedLayout, xs: computedLayout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
          cols={{ lg: 4, md: 3, sm: 2, xs: 1 }}
          rowHeight={120}
          dragConfig={{ handle: '.widget-drag-handle' }}
          onLayoutChange={handleLayoutChange}
          margin={[16, 16] as const}
          containerPadding={[0, 0] as const}
        >
          {widgets.map((widget) => {
            // Find current dimensions for this widget to pass to the plugin
            const currentItem = computedLayout.find(l => l.i === widget.widgetId)
            const currentSize = {
              w: currentItem?.w || widget.defaultSize.w,
              h: currentItem?.h || widget.defaultSize.h,
            }

            return (
              <div
                key={widget.widgetId}
                className={cn(
                  'group flex flex-col bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden'
                )}
              >
                {/* Widget Header / Drag Handle */}
                <div className="widget-drag-handle flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border cursor-grab active:cursor-grabbing select-none h-9 shrink-0">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate pointer-events-none">
                    {widget.name}
                  </span>
                  <GripHorizontal className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </div>

                {/* Widget Content */}
                <div className="flex-1 overflow-hidden relative min-h-0 bg-card">
                  <PluginWidget
                    registration={widget}
                    size={currentSize}
                  />
                </div>
              </div>
            )
          })}
        </Responsive>
      )}
    </div>
  )
}
