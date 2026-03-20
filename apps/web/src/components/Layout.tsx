import { Outlet, useMatch } from 'react-router-dom'
import { useAuthStore, useUIStore } from '../store'
import { Bell } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useAutoRefresh } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { useIdleTimeout } from '../hooks/useIdleTimeout'
import { api } from '../api/client'
import { queryKeys } from '../api/query-keys'
import LockScreen from './LockScreen'
import Sidebar from './Sidebar'
import TabViewport from './TabViewport'

export default function Layout() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const tabRouteMatch = useMatch('/tab/:id')

  // ── Hooks: auto-refresh, theme, idle timeout ──────────────────
  useAutoRefresh()
  const { resolvedTheme } = useTheme()
  useIdleTimeout()

  // ── Update checker (admin only) ─────────────────────────────────
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.group_id === 0
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  const updateQuery = useQuery({
    queryKey: queryKeys.update.check,
    queryFn: () => api.update.check(),
    enabled: isAdmin,
    refetchInterval: 60 * 60 * 1000,
    select: (res) => res.data?.data,
  })

  const updateAvailable = updateQuery.data?.updateAvailable ?? false
  const latestVersion = updateQuery.data?.latestVersion ?? ''
  const releaseUrl = updateQuery.data?.releaseUrl ?? ''

  // Close bell dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])
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
        <button
          type="button"
          className="fixed inset-0 bg-black/50 z-10 backdrop-blur-sm"
          onClick={() => toggleSidebar()}
          aria-label="Close sidebar overlay"
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="h-16 border-b border-border bg-background/50 backdrop-blur-md flex items-center justify-end px-6 shrink-0 z-10">
          <div className="flex items-center space-x-4">
            {isAdmin && (
              <div className="relative" ref={bellRef}>
                <button
                  type="button"
                  onClick={() => setBellOpen(!bellOpen)}
                  className="relative p-2 rounded-md hover:bg-muted transition-colors"
                  aria-label="Update notifications"
                >
                  <Bell size={20} />
                  {updateAvailable && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
                  )}
                </button>
                {bellOpen && updateAvailable && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-popover border border-border rounded-lg shadow-lg p-4 z-50">
                    <p className="text-sm font-medium">Update available: v{latestVersion}</p>
                    <a
                      href={releaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm text-primary hover:underline"
                    >
                      View release &rarr;
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative">
          <TabViewport />
          <div className={tabRouteMatch ? 'hidden' : 'h-full overflow-auto p-6 scroll-smooth'}>
            <div className="max-w-7xl mx-auto animate-reveal">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
