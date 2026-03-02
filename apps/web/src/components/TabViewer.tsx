import { useState, useEffect, useRef, useCallback } from 'react'
import type { Tab } from '@organizrx/shared'
import { cn } from '../utils'
import ManagedIframe from './ManagedIframe'
import { Monitor } from 'lucide-react'

// ── Props ────────────────────────────────────────────────────────
interface TabViewerProps {
  tabs: Tab[]
  activeTabId: number | null
  onTabChange: (id: number) => void
  isLocalNetwork?: boolean
}

// ── useTabPing hook ──────────────────────────────────────────────
// Pings a tab's URL periodically and returns online status.
export function useTabPing(tab: Tab | null) {
  const [isOnline, setIsOnline] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    if (!tab || tab.ping !== 1) {
      setIsOnline(false)
      return
    }

    const pingUrl = tab.ping_url || tab.url
    if (!pingUrl) return

    const controller = new AbortController()

    const doPing = async () => {
      setIsChecking(true)
      try {
        await fetch(pingUrl, {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal,
        })
        // no-cors means opaque response — if fetch doesn't throw, server is reachable
        setIsOnline(true)
      } catch {
        setIsOnline(false)
      } finally {
        setIsChecking(false)
      }
    }

    doPing()
    intervalRef.current = setInterval(doPing, 30_000)

    return () => {
      controller.abort()
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [tab?.id, tab?.ping, tab?.ping_url, tab?.url])

  return { isOnline, isChecking }
}

// ── TabViewer ────────────────────────────────────────────────────
export default function TabViewer({
  tabs,
  activeTabId,
  onTabChange,
  isLocalNetwork = false,
}: TabViewerProps) {
  const [splashTabId, setSplashTabId] = useState<number | null>(null)
  const splashTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // Resolve the URL for a tab (local vs remote)
  const resolveUrl = useCallback(
    (tab: Tab): string | null => {
      if (isLocalNetwork && tab.url_local) return tab.url_local
      return tab.url
    },
    [isLocalNetwork],
  )

  // Filter to external-only tabs (type 0/null with a URL)
  const externalTabs = tabs.filter(
    (t) => (t.type === 0 || t.type === null) && t.url,
  )

  // Preloaded tabs stay mounted even when not active
  const preloadedTabs = externalTabs.filter((t) => t.preload === 1)
  const activeTab = externalTabs.find((t) => t.id === activeTabId) ?? null
  const isActiveExternal = activeTab !== null

  // Tabs to render: all preloaded + active (if not already preloaded)
  const tabsToRender = [
    ...preloadedTabs,
    ...(activeTab && activeTab.preload !== 1 ? [activeTab] : []),
  ]
  // Deduplicate by id
  const seen = new Set<number>()
  const uniqueTabsToRender = tabsToRender.filter((t) => {
    if (seen.has(t.id)) return false
    seen.add(t.id)
    return true
  })

  // Splash screen logic
  useEffect(() => {
    if (!activeTab || activeTab.splash !== 1) {
      setSplashTabId(null)
      return
    }

    setSplashTabId(activeTab.id)
    splashTimerRef.current = setTimeout(() => {
      setSplashTabId(null)
    }, 1500)

    return () => {
      if (splashTimerRef.current) clearTimeout(splashTimerRef.current)
    }
  }, [activeTabId])

  // Keyboard navigation: Ctrl+1-9 for first 9 visible tabs
  useEffect(() => {
    const enabledTabs = tabs
      .filter((t) => t.enabled === 1)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return

      const num = parseInt(e.key, 10)
      if (num >= 1 && num <= 9) {
        const tab = enabledTabs[num - 1]
        if (tab) {
          e.preventDefault()
          onTabChange(tab.id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tabs, onTabChange])

  // If active tab is internal (type 1), render nothing — React Router handles it
  if (!isActiveExternal && activeTabId !== null) {
    return null
  }

  // No active tab at all
  if (!activeTabId) {
    return null
  }

  return (
    <div className="relative h-full w-full">
      {/* Splash overlay */}
      {splashTabId !== null && (
        <div
          className={cn(
            'absolute inset-0 z-20 flex flex-col items-center justify-center bg-background transition-opacity duration-500',
            splashTabId === activeTabId ? 'animate-pulse opacity-100' : 'opacity-0 pointer-events-none',
          )}
        >
          <Monitor className="mb-4 h-16 w-16 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">
            {activeTab?.name ?? 'Loading…'}
          </h2>
        </div>
      )}

      {/* Render iframes */}
      {uniqueTabsToRender.map((tab) => {
        const url = resolveUrl(tab)
        if (!url) return null

        return (
          <ManagedIframe
            key={tab.id}
            src={url}
            title={tab.name}
            tabId={tab.id}
            isActive={tab.id === activeTabId}
            timeoutMs={tab.timeout_ms ?? tab.timeout ?? 10000}
          />
        )
      })}
    </div>
  )
}
