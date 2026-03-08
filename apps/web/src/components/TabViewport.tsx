import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMatch } from 'react-router-dom'
import { api } from '../api/client'
import { cn } from '../utils'
import { useTabStore } from '../store'
import ManagedIframe from './ManagedIframe'

interface ViewportTab {
  id: number
  name: string | null
  url: string | null
  url_local: string | null
  enabled: number | null
  type: number | null
  timeout: number | null
  timeout_ms: number | null
}

interface SidebarResponse {
  tabs: ViewportTab[]
}

export default function TabViewport() {
  const [tabs, setTabs] = useState<ViewportTab[]>([])
  const activeTabId = useTabStore((s) => s.activeTabId)
  const mountedTabs = useTabStore((s) => s.mountedTabs)
  const mountTab = useTabStore((s) => s.mountTab)
  const tabRouteMatch = useMatch('/tab/:id')

  const isLocalNetwork = false

  const fetchTabs = useCallback(async () => {
    try {
      const res = await api.tabs.sidebar()
      const data = res.data?.data as SidebarResponse
      setTabs(data?.tabs ?? [])
    } catch {
      setTabs([])
    }
  }, [])

  useEffect(() => {
    fetchTabs()
  }, [fetchTabs])

  useEffect(() => {
    if (activeTabId !== null) {
      mountTab(activeTabId)
    }
  }, [activeTabId, mountTab])

  const resolveUrl = useCallback(
    (tab: ViewportTab): string | null => {
      if (isLocalNetwork && tab.url_local) return tab.url_local
      return tab.url
    },
    [isLocalNetwork]
  )

  const externalTabs = useMemo(
    () => tabs.filter((tab) => tab.enabled !== 0 && (tab.type === 0 || tab.type === null)),
    [tabs]
  )

  const renderedTabs = useMemo(
    () => externalTabs.filter((tab) => tab.id === activeTabId || mountedTabs.includes(tab.id)),
    [externalTabs, activeTabId, mountedTabs]
  )

  if (renderedTabs.length === 0) {
    return null
  }

  return (
    <div className="absolute inset-0">
      {renderedTabs.map((tab) => {
        const url = resolveUrl(tab)
        if (!url) return null

        const isVisible = tabRouteMatch !== null && tab.id === activeTabId

        return (
          <div
            key={tab.id}
            data-mounted-tab-id={tab.id}
            className={cn(
              'absolute inset-0 transition-opacity duration-200',
              isVisible ? 'visible opacity-100' : 'invisible pointer-events-none opacity-0'
            )}
          >
            <ManagedIframe
              src={url}
              title={tab.name ?? 'Tab content'}
              tabId={tab.id}
              isActive={isVisible}
              timeoutMs={tab.timeout_ms ?? tab.timeout ?? 10000}
            />
          </div>
        )
      })}
    </div>
  )
}
