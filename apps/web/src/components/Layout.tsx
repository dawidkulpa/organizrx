import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuthStore, useUIStore, useLockscreenStore } from '../store'
import { cn } from '../utils'
import {
  LayoutDashboard,
  Settings,
  Users,
  Menu,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Layers,
  Lock,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Toaster } from 'sonner'
import { useAutoRefresh } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { useIdleTimeout } from '../hooks/useIdleTimeout'
import LockScreen from './LockScreen'

export default function Layout() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { user, logout } = useAuthStore()
  const lockScreen = useLockscreenStore((s) => s.lock)
  const location = useLocation()

  // ── Hooks: auto-refresh, theme, idle timeout ──────────────────
  useAutoRefresh()
  const { resolvedTheme } = useTheme()
  useIdleTimeout()

  // Mobile check
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Tabs', path: '/tabs', icon: Layers },
    { name: 'Users', path: '/users', icon: Users },
    { name: 'Settings', path: '/settings', icon: Settings },
  ]

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Toaster position="top-right" theme={resolvedTheme} />
      <LockScreen />

      {/* Sidebar */}
      <aside
        className={cn(
          'bg-card border-r border-border transition-all duration-300 ease-in-out flex flex-col z-20',
          sidebarOpen ? 'w-64' : 'w-16',
          isMobile && !sidebarOpen && '-ml-16',
          isMobile && sidebarOpen && 'fixed inset-y-0 left-0 w-64 shadow-xl',
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
              className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
            >
              {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
          )}
        </div>

        <nav className="flex-1 py-4 space-y-1 overflow-y-auto px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center px-3 py-2 rounded-md transition-all duration-200 group relative',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  !sidebarOpen && 'justify-center',
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
        </nav>

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

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 backdrop-blur-sm"
          onClick={() => toggleSidebar()}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="h-16 border-b border-border bg-background/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center">
            {isMobile && (
              <button onClick={toggleSidebar} className="mr-4 p-2 rounded-md hover:bg-muted">
                <Menu size={20} />
              </button>
            )}
            <h1 className="text-lg font-medium capitalize">
              {location.pathname === '/' ? 'Dashboard' : location.pathname.split('/')[1]}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="w-64 hidden md:block">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full bg-muted/50 border border-border rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 scroll-smooth">
          <div className="max-w-7xl mx-auto animate-reveal">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
