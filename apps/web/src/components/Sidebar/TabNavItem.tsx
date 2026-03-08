import { NavLink } from 'react-router-dom'
import { cn } from '../../utils'
import { TabIcon } from './TabIcon'
import { type SidebarTab, getTabRoute } from './use-sidebar'

interface TabNavItemProps {
  tab: SidebarTab
  sidebarOpen: boolean
}

export function TabNavItem({ tab, sidebarOpen }: TabNavItemProps) {
  const to = getTabRoute(tab)
  // For the dashboard route (/) we need 'end' to avoid matching all paths
  const isRootRoute = to === '/'

  return (
    <NavLink
      to={to}
      end={isRootRoute}
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
      <TabIcon tabId={tab.id} image={tab.image} sidebarOpen={sidebarOpen} />
      {sidebarOpen && <span className="truncate">{tab.name}</span>}
      {!sidebarOpen && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
          {tab.name}
        </div>
      )}
    </NavLink>
  )
}
