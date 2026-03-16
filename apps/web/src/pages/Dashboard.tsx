import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { queryKeys } from '../api/query-keys'
import { discoverWidgets, PluginWidgetRegistration } from '../plugins/widget-registry'
import { WidgetGrid } from '../components/WidgetGrid'
import { EmptyState } from '../components/EmptyState'
import type { LayoutItem } from 'react-grid-layout'
import { RefreshCw, LayoutGrid } from 'lucide-react'
import { toast } from 'sonner'

export default function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [widgets, setWidgets] = useState<PluginWidgetRegistration[]>([])
  const [layout, setLayout] = useState<LayoutItem[]>([])
  const [widgetsLoading, setWidgetsLoading] = useState(true)

  // Fetch dashboard layout settings via React Query
  const layoutQuery = useQuery({
    queryKey: queryKeys.dashboard.layout,
    queryFn: () => api.settings.getAll('dashboard_layout').catch(() => ({ data: [] })),
  })

  // Discover widgets (client-side plugin discovery — NOT an API call)
  useEffect(() => {
    const loadWidgets = async () => {
      setWidgetsLoading(true)
      try {
        const discovered = await discoverWidgets()
        setWidgets(discovered)
      } catch {
        toast.error('Failed to discover dashboard widgets')
      } finally {
        setWidgetsLoading(false)
      }
    }

    loadWidgets()
  }, [])

  // Parse layout from query data
  useEffect(() => {
    if (layoutQuery.data) {
      const settingsRes = layoutQuery.data
      // API typically returns an array of settings. Find the specific key.
      const layoutSetting = Array.isArray(settingsRes.data)
        ? settingsRes.data.find((s: { key: string; value: string }) => s.key === 'dashboard_layout')
        : settingsRes.data // fallback if api returns object

      if (layoutSetting?.value) {
        try {
          const parsed = JSON.parse(layoutSetting.value)
          if (Array.isArray(parsed)) {
            setLayout(parsed)
          }
        } catch {
          // Layout parse failed — use defaults
        }
      } else {
        setLayout([])
      }
    }
  }, [layoutQuery.data])

  const handleLayoutChange = (newLayout: LayoutItem[]) => {
    setLayout(newLayout)

    // We only save if not loading to avoid overwriting with empty
    if (!widgetsLoading && !layoutQuery.isLoading && widgets.length > 0) {
      api.settings
        .update({
          key: 'dashboard_layout',
          value: JSON.stringify(newLayout),
        })
        .catch(() => {
          // Silent failure — non-critical save
        })
    }
  }

  const isLoading = widgetsLoading || layoutQuery.isLoading

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse p-8">
        <div className="flex justify-between items-center mb-8">
          <div className="h-8 w-32 bg-muted rounded"></div>
          <div className="h-8 w-8 bg-muted rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-muted rounded-lg border border-border"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        </div>
        <button
          type="button"
          onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.layout })}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          title="Refresh Widgets"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {widgets.length === 0 ? (
          <EmptyState
            message="Your dashboard is empty. Add tabs to see them here."
            actionLabel="Browse Tabs"
            onAction={() => navigate('/settings', { state: { tab: 'tabs' } })}
          />
        ) : (
          <WidgetGrid widgets={widgets} layout={layout} onLayoutChange={handleLayoutChange} />
        )}
      </div>
    </div>
  )
}
