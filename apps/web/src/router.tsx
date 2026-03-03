import { createBrowserRouter, Navigate, type RouterProviderProps } from 'react-router-dom'
import type { ReactNode } from 'react'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Tabs from './pages/Tabs'
import Users from './pages/Users'
import Wizard from './pages/Wizard'
import Migration from './pages/Migration'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'
import { useAuthStore } from './store'

// ── Settings sub-pages (lazy-style but static for now) ──────────
import SettingsGeneral from './pages/settings/General'
import SettingsAppearance from './pages/settings/Appearance'
import SettingsAuthentication from './pages/settings/Authentication'
import SettingsSSO from './pages/settings/SSO'
import SettingsHomepage from './pages/settings/Homepage'
import SettingsTabs from './pages/settings/Tabs'
import SettingsUsers from './pages/settings/Users'
import SettingsGroups from './pages/settings/Groups'
import SettingsPlugins from './pages/settings/Plugins'
import SettingsSystem from './pages/settings/System'
import SettingsProfile from './pages/settings/Profile'
import SettingsAccount from './pages/settings/Account'

// ── Route guards ────────────────────────────────────────────────
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

const PublicRoute = ({ children }: { children: ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (isAuthenticated) return <Navigate to="/" replace />
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
    element: <Wizard />,
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
      { path: 'tabs', element: <Tabs /> },
      { path: 'users', element: <Users /> },
      {
        path: 'settings',
        element: <Settings />,
        children: [
          { index: true, element: <Navigate to="general" replace /> },
          { path: 'general', element: <SettingsGeneral /> },
          { path: 'appearance', element: <SettingsAppearance /> },
          { path: 'authentication', element: <SettingsAuthentication /> },
          { path: 'sso', element: <SettingsSSO /> },
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
