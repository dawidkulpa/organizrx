import { NavLink, Outlet } from 'react-router-dom'
import {
  Settings,
  Home,
  Layers,
  Shield,
  Users,
  UserCog,
  Palette,
  Server,
  Puzzle,
  Key,
} from 'lucide-react'
import { cn } from '../utils'

export default function SettingsLayout() {
  const sidebarItems = [
    { icon: Settings, label: 'General', to: '/settings/general' },
    { icon: Home, label: 'Homepage', to: '/settings/homepage' },
    { icon: Layers, label: 'Tabs', to: '/settings/tabs' },
    { icon: Shield, label: 'Authentication', to: '/settings/authentication' },
    { icon: Users, label: 'Users', to: '/settings/users' },
    { icon: UserCog, label: 'Groups', to: '/settings/groups' },
    { icon: Palette, label: 'Appearance', to: '/settings/appearance' },
    { icon: Server, label: 'System', to: '/settings/system' },
    { icon: Puzzle, label: 'Plugins', to: '/settings/plugins' },
    { icon: Key, label: 'SSO', to: '/settings/sso' },
  ]

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background text-foreground">
      {/* Sidebar - Desktop: Left, Mobile: Top Scroll */}
      <aside className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:h-screen md:w-64 md:border-b-0 md:border-r">
        <div className="flex h-14 items-center border-b px-6">
          <Settings className="mr-2 h-5 w-5 text-primary" />
          <span className="font-bold tracking-tight">Settings</span>
        </div>

        <nav className="flex overflow-x-auto p-4 md:flex-col md:overflow-visible md:space-y-1">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex min-w-fit items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
