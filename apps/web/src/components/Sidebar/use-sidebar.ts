import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore, useUIStore, useLockscreenStore } from '../../store'
import { api } from '../../api/client'
import { queryKeys } from '../../api/query-keys'
import { useTabPing } from '../../hooks/use-tab-ping'

export interface SidebarTab {
  id: number
  order: number | null
  category_id: number | null
  name: string | null
  url: string | null
  url_local: string | null
  enabled: number | null
  group_id: number | null
  image: string | null
  type: number | null
  isDefault: number | null
}

export interface SidebarCategory {
  id: number
  order: number | null
  name: string
  image: string | null
}

// Internal tab URL -> frontend route mapping
const INTERNAL_ROUTES: Record<string, string> = {
  '/': '/',
  '/dashboard': '/',
  '/users': '/users',
  '/settings': '/settings',
}

export function getTabRoute(tab: SidebarTab): string {
  if (tab.type === 1 && tab.url && INTERNAL_ROUTES[tab.url]) {
    return INTERNAL_ROUTES[tab.url] ?? tab.url
  }
  return `/tab/${tab.id}`
}

export function useSidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { user, logout } = useAuthStore()
  const lockScreen = useLockscreenStore((s) => s.lock)
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.tabs.sidebar,
    queryFn: () => api.tabs.sidebar(),
  })

  const tabs: SidebarTab[] = data?.data?.data?.tabs ?? []
  const categories: SidebarCategory[] = data?.data?.data?.categories ?? []

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const enabledTabs = useMemo(() => tabs.filter((t) => t.enabled !== 0), [tabs])
  useTabPing(enabledTabs)

  const sortedTabs = [...enabledTabs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const uncategorizedTabs = sortedTabs.filter((t) => t.category_id === null || t.category_id === 0)

  const categorizedMap = new Map<number, SidebarTab[]>()
  for (const tab of sortedTabs) {
    if (tab.category_id && tab.category_id !== 0) {
      const existing = categorizedMap.get(tab.category_id) ?? []
      existing.push(tab)
      categorizedMap.set(tab.category_id, existing)
    }
  }

  const sortedCategories = [...categories]
    .filter((c) => categorizedMap.has(c.id))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  return {
    sidebarOpen,
    toggleSidebar,
    user,
    logout,
    lockScreen,
    isLoading,
    isMobile,
    uncategorizedTabs,
    sortedCategories,
    categorizedMap,
  }
}
