import { NavLink } from 'react-router-dom'
import { cn } from '../../utils'
import { TabIcon } from './TabIcon'
import { SidebarTab } from './use-sidebar'

interface TabNavItemProps {
  tab: SidebarTab
  sidebarOpen: boolean
}

export function TabNavItem({ tab, sidebarOpen }: TabNavItemProps) {
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
