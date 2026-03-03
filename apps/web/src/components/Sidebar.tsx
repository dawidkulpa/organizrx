import { useState, useEffect, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuthStore, useUIStore, useLockscreenStore } from '../store'
import { cn } from '../utils'
import { api } from '../api/client'
import {
  LayoutDashboard,
  Settings,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AppWindow,
  Loader2,
  Lock,
  LogOut,
} from 'lucide-react'

interface SidebarTab {
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

interface SidebarCategory {
  id: number
  order: number | null
  name: string
  image: string | null
}

interface CategorySectionProps {
  category: SidebarCategory
  tabs: SidebarTab[]
  sidebarOpen: boolean
}

function CategorySection({ category, tabs, sidebarOpen }: CategorySectionProps) {
  const [expanded, setExpanded] = useState(true)

  if (tabs.length === 0) return null

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex items-center w-full px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-wider',
          'text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200',
          !sidebarOpen && 'justify-center'
        )}
      >
        {sidebarOpen ? (
          <>
            <span className="flex-1 text-left truncate">{category.name}</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </>
        ) : (
          <span className="text-[10px]" title={category.name}>
            {category.name.charAt(0)}
          </span>
        )}
      </button>

      {(expanded || !sidebarOpen) && (
        <div className="space-y-0.5">
          {tabs.map((tab) => (
            <TabNavItem key={tab.id} tab={tab} sidebarOpen={sidebarOpen} />
          ))}
        </div>
      )}
    </div>
  )
}

interface TabNavItemProps {
  tab: SidebarTab
  sidebarOpen: boolean
}

function TabNavItem({ tab, sidebarOpen }: TabNavItemProps) {
  return (
    <NavLink
      to={`/tab/${tab.id}`}
      className={({ isActive }) =>
        cn(
          'flex items-center px-3 py-2 rounded-md transition-all duration-200 group relative',
          isActive
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          !sidebarOpen && 'justify-center'
        )
      }
    >
      <TabIcon image={tab.image} sidebarOpen={sidebarOpen} />
      {sidebarOpen && <span className="truncate">{tab.name}</span>}
      {!sidebarOpen && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
          {tab.name}
        </div>
      )}
    </NavLink>
  )
}

function TabIcon({ image, sidebarOpen }: { image: string | null; sidebarOpen: boolean }) {
  if (image) {
    const src = image.startsWith('http') || image.startsWith('/') ? image : `/images/tabs/${image}`
    return (
      <img
        src={src}
        alt=""
        className={cn('w-5 h-5 shrink-0 rounded-sm object-contain', sidebarOpen && 'mr-3')}
        onError={(e) => {
          const target = e.currentTarget
          target.style.display = 'none'
          const fallback = target.nextElementSibling
          if (fallback) (fallback as HTMLElement).style.display = 'block'
        }}
      />
    )
  }
  return <AppWindow size={20} className={cn('shrink-0', sidebarOpen && 'mr-3')} />
}

export default function Sidebar() {
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

  return (
    <aside
      className={cn(
        'bg-card border-r border-border transition-all duration-300 ease-in-out flex flex-col z-20',
        sidebarOpen ? 'w-64' : 'w-16',
        isMobile && !sidebarOpen && '-ml-16',
        isMobile && sidebarOpen && 'fixed inset-y-0 left-0 w-64 shadow-xl'
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {sidebarOpen ? (
          <div className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            OrganizrX
          </div>
        ) : (
          <div className="mx-auto font-bold text-xl text-primary">O</div>
        )}

        {!isMobile && (
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
          >
            {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto px-2">
        {/* Dashboard — pinned at top */}
        <NavLink
          to={dashboardItem.path}
          end
          className={({ isActive }) =>
            cn(
              'flex items-center px-3 py-2 rounded-md transition-all duration-200 group relative',
              isActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              !sidebarOpen && 'justify-center'
            )
          }
        >
          <dashboardItem.icon size={20} className={cn('shrink-0', sidebarOpen && 'mr-3')} />
          {sidebarOpen && <span>{dashboardItem.name}</span>}
          {!sidebarOpen && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
              {dashboardItem.name}
            </div>
          )}
        </NavLink>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={18} className="animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Uncategorized tabs — always expanded, root level */}
        {uncategorizedTabs.map((tab) => (
          <TabNavItem key={tab.id} tab={tab} sidebarOpen={sidebarOpen} />
        ))}

        {/* Category sections — collapsible */}
        {sortedCategories.length > 0 && uncategorizedTabs.length > 0 && (
          <div className="my-2 border-t border-border" />
        )}

        {sortedCategories.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            tabs={categorizedMap.get(category.id) ?? []}
            sidebarOpen={sidebarOpen}
          />
        ))}

        {/* Utility items at bottom of nav */}
        {utilityItems.length > 0 && (
          <>
            <div className="my-2 border-t border-border" />
            {utilityItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center px-3 py-2 rounded-md transition-all duration-200 group relative',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    !sidebarOpen && 'justify-center'
                  )
                }
              >
                <item.icon size={20} className={cn('shrink-0', sidebarOpen && 'mr-3')} />
                {sidebarOpen && <span>{item.name}</span>}
                {!sidebarOpen && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                    {item.name}
                  </div>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-border">
        <div className={cn('flex items-center', !sidebarOpen && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold shrink-0">
            {user?.username?.[0] || 'U'}
          </div>

          {sidebarOpen && (
            <div className="ml-3 overflow-hidden flex-1">
              <p className="text-sm font-medium truncate">{user?.username || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email || 'user@example.com'}
              </p>
            </div>
          )}

          {sidebarOpen && (
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={lockScreen}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Lock screen"
              >
                <Lock size={16} />
              </button>
              <button
                onClick={logout}
                className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
