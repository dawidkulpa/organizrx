import { ChevronLeft, ChevronRight, Loader2, Lock, LogOut } from 'lucide-react'
import { cn } from '../../utils'
import { getInitials, getAvatarColor } from '../../utils/avatar-utils'
import { useSidebar } from './use-sidebar'
import { TabNavItem } from './TabNavItem'
import { CategorySection } from './CategorySection'

export default function Sidebar() {
  const {
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
  } = useSidebar()

  return (
    <aside
      className={cn(
        'bg-card border-r border-border transition-all duration-300 ease-in-out flex flex-col z-20',
        sidebarOpen ? 'w-64' : 'w-16',
        isMobile && !sidebarOpen && '-ml-16',
        isMobile && sidebarOpen && 'fixed inset-y-0 left-0 w-64 shadow-xl'
      )}
    >
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
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
          >
            {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 space-y-1 overflow-y-auto px-2">
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={18} className="animate-spin text-muted-foreground" />
          </div>
        )}

        {/* All tabs (including internal ones) rendered uniformly by order */}
        {uncategorizedTabs.map((tab) => (
          <TabNavItem key={tab.id} tab={tab} sidebarOpen={sidebarOpen} />
        ))}

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
      </nav>

      <div className="p-4 border-t border-border">
        <div className={cn('flex items-center', !sidebarOpen && 'justify-center')}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shrink-0 text-sm"
            style={{ backgroundColor: getAvatarColor(user?.username || '') }}
          >
            {getInitials(user?.username || '')}
          </div>

          {sidebarOpen && (
            <div className="ml-3 overflow-hidden flex-1">
              <p className="text-sm font-medium truncate">{user?.username || 'User'}</p>
              {user?.email && (
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              )}
            </div>
          )}

          {sidebarOpen && (
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={lockScreen}
                aria-label="Lock screen"
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Lock screen"
              >
                <Lock size={16} />
              </button>
              <button
                onClick={logout}
                aria-label="Log out"
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
