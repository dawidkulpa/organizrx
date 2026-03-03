import { Outlet, useLocation } from 'react-router-dom'
import { useUIStore } from '../store'
import { Menu } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Toaster } from 'sonner'
import { useAutoRefresh } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { useIdleTimeout } from '../hooks/useIdleTimeout'
import LockScreen from './LockScreen'
import Sidebar from './Sidebar'

export default function Layout() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
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

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Toaster position="top-right" theme={resolvedTheme} />
      <LockScreen />

      {/* Sidebar */}
      <Sidebar />

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
