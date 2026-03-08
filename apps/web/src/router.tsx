import { createBrowserRouter, Navigate, type RouterProviderProps } from 'react-router-dom'
import type { ReactNode } from 'react'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import Login from './pages/login'
import Dashboard from './pages/Dashboard'
import Tabs from './pages/Tabs'
import Users from './pages/Users'
import Wizard from './pages/wizard'
import Migration from './pages/Migration'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'
import { useAuthStore } from './store'
import { useSessionInit } from './hooks/useAuth'

// ── Settings sub-pages (lazy-style but static for now) ──────────
import SettingsGeneral from './pages/settings/General'
import SettingsAppearance from './pages/settings/Appearance'
import SettingsAuthentication from './pages/settings/Authentication'
import SettingsHomepage from './pages/settings/Homepage'
import SettingsTabs from './pages/settings/Tabs'
import SettingsUsers from './pages/settings/Users'
import SettingsGroups from './pages/settings/Groups'
import SettingsPlugins from './pages/settings/Plugins'
import SettingsSystem from './pages/settings/System'
import SettingsProfile from './pages/settings/Profile'
import SettingsAccount from './pages/settings/Account'

// ── Route guards ────────────────────────────────────────────────
const FullScreenLoader = () => (
  <div className="flex h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
)

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  useSessionInit()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isInitializing = useAuthStore((s) => s.isInitializing)
  const needsSetup = useAuthStore((s) => s.needsSetup)

  if (isInitializing) {
    return <FullScreenLoader />
  }

  if (needsSetup) return <Navigate to="/wizard" replace />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

const PublicRoute = ({ children }: { children: ReactNode }) => {
  useSessionInit()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isInitializing = useAuthStore((s) => s.isInitializing)
  const needsSetup = useAuthStore((s) => s.needsSetup)

  if (isInitializing) return <FullScreenLoader />
  if (needsSetup) return <Navigate to="/wizard" replace />
  if (isAuthenticated) return <Navigate to="/" replace />
  return children
}

const WizardRoute = ({ children }: { children: ReactNode }) => {
  useSessionInit()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isInitializing = useAuthStore((s) => s.isInitializing)
  const needsSetup = useAuthStore((s) => s.needsSetup)

  if (isInitializing) return <FullScreenLoader />
  if (!needsSetup) return <Navigate to={isAuthenticated ? '/' : '/login'} replace />
  return children
}

export const router: RouterProviderProps['router'] = createBrowserRouter([
  // ── Public routes ─────────────────────────────────────────────
  {
    path: '/login',
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
  },
  {
    path: '/wizard',
    element: (
      <WizardRoute>
        <Wizard />
      </WizardRoute>
    ),
  },
  {
    path: '/migration',
    element: <Migration />,
  },

  // ── Protected routes (inside Layout) ──────────────────────────
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'tab/:id', element: <Tabs /> },
      { path: 'users', element: <Users /> },
      {
        path: 'settings',
        element: <Settings />,
        children: [
          { index: true, element: <Navigate to="general" replace /> },
          { path: 'general', element: <SettingsGeneral /> },
          { path: 'appearance', element: <SettingsAppearance /> },
          { path: 'authentication', element: <SettingsAuthentication /> },
          { path: 'homepage', element: <SettingsHomepage /> },
          { path: 'tabs', element: <SettingsTabs /> },
          { path: 'users', element: <SettingsUsers /> },
          { path: 'groups', element: <SettingsGroups /> },
          { path: 'plugins', element: <SettingsPlugins /> },
          { path: 'system', element: <SettingsSystem /> },
          { path: 'profile', element: <SettingsProfile /> },
          { path: 'account', element: <SettingsAccount /> },
        ],
      },
    ],
  },

  // ── Catch-all ─────────────────────────────────────────────────
  { path: '*', element: <NotFound /> },
])
