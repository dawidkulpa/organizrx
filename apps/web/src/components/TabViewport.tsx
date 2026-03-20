import type { Tab } from '@organizrx/shared'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useMatch } from 'react-router-dom'
import { api } from '../api/client'
import { queryKeys } from '../api/query-keys'
import { cn } from '../utils'
import { useTabStore } from '../store'
import { useTabPingStore } from '../store/tab-ping'
import ManagedIframe from './ManagedIframe'

type ViewportTab = Pick<
  Tab,
  | 'id'
  | 'name'
  | 'url'
  | 'url_local'
  | 'enabled'
  | 'type'
  | 'timeout'
  | 'timeout_ms'
  | 'preload'
  | 'splash'
>

interface SidebarResponse {
  tabs: ViewportTab[]
}

export default function TabViewport() {
  const activeTabId = useTabStore((s) => s.activeTabId)
  const mountedTabs = useTabStore((s) => s.mountedTabs)
  const mountTab = useTabStore((s) => s.mountTab)
  const tabRouteMatch = useMatch('/tab/:id')

  const isLocalNetwork = false

  const { data } = useQuery({
    queryKey: queryKeys.tabs.sidebar,
    queryFn: () => api.tabs.sidebar(),
  })

  const tabs = (data?.data?.data as SidebarResponse | undefined)?.tabs ?? []

  useEffect(() => {
    if (activeTabId !== null) {
      mountTab(activeTabId)
    }
  }, [activeTabId, mountTab])

  const resolveUrl = (tab: ViewportTab): string | null => {
    if (isLocalNetwork && tab.url_local) return tab.url_local
    return tab.url
  }

  const externalTabs = useMemo(
    () => tabs.filter((tab) => tab.enabled !== 0 && (tab.type === 0 || tab.type === null)),
    [tabs]
  )

  useEffect(() => {
    externalTabs
      .filter((tab) => tab.preload === 1)
      .forEach((tab) => {
        mountTab(tab.id)
      })
  }, [externalTabs, mountTab])

  const renderedTabs = useMemo(
    () => externalTabs.filter((tab) => tab.id === activeTabId || mountedTabs.includes(tab.id)),
    [externalTabs, activeTabId, mountedTabs]
  )

  const pingResults = useTabPingStore((state) => state.results)

  if (renderedTabs.length === 0) {
    return null
  }

  return (
    <div className="absolute inset-0">
      {renderedTabs.map((tab) => {
        const url = resolveUrl(tab)
        if (!url) return null

        const isVisible = tabRouteMatch !== null && tab.id === activeTabId
        const pingResult = pingResults[tab.id]
        const isIframeBlocked = pingResult !== undefined && pingResult.iframeAllowed === false

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
              iframeBlocked={isIframeBlocked}
              preload={tab.preload === 1}
              splash={tab.splash !== 0}
              timeoutMs={tab.timeout_ms ?? tab.timeout ?? undefined}
            />
          </div>
        )
      })}
    </div>
  )
}
