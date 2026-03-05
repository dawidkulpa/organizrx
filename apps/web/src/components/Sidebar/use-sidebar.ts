import { useState, useEffect, useCallback } from 'react'
import { useAuthStore, useUIStore, useLockscreenStore } from '../../store'
import { api } from '../../api/client'
import { LayoutDashboard, Settings, Users } from 'lucide-react'

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
}

export interface SidebarCategory {
  id: number
  order: number | null
  name: string
  image: string | null
}

export function useSidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { user, logout } = useAuthStore()
  const lockScreen = useLockscreenStore((s) => s.lock)
  const [tabs, setTabs] = useState<SidebarTab[]>([])
  const [categories, setCategories] = useState<SidebarCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const isAdmin = user?.group_id === 0

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const fetchSidebarData = useCallback(async () => {
    try {
      const res = await api.tabs.sidebar()
      const { tabs: fetchedTabs, categories: fetchedCategories } = res.data.data
      setTabs(fetchedTabs)
      setCategories(fetchedCategories)
    } catch {
      // Error handling is done in the component or silently failed
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSidebarData()
  }, [fetchSidebarData])

  const enabledTabs = tabs.filter((t) => t.enabled !== 0)

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

  const dashboardItem = { name: 'Dashboard', path: '/', icon: LayoutDashboard }
  const utilityItems = [
    ...(isAdmin ? [{ name: 'Users', path: '/users', icon: Users }] : []),
    { name: 'Settings', path: '/settings', icon: Settings },
  ]

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
    dashboardItem,
    utilityItems,
  }
}
