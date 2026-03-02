import { createBrowserRouter, Navigate, type RouterProviderProps } from 'react-router-dom';
import type { ReactNode } from 'react';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tabs from './pages/Tabs';
import Users from './pages/Users';
import Wizard from './pages/Wizard';
import Settings from './pages/Settings';
import SettingsProfile from './pages/settings/Profile';
import SettingsAccount from './pages/settings/Account';
import NotFound from './pages/NotFound';
import { useAuthStore } from './store';

// Protected Route wrapper
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Public Route wrapper (redirect to home if already logged in)
const PublicRoute = ({ children }: { children: ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

export const router: RouterProviderProps['router'] = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'tabs',
        element: <Tabs />,
      },
      {
        path: 'users',
        element: <Users />,
      },
      {
        path: 'wizard',
        element: <Wizard />,
      },
      {
        path: 'settings',
        element: <Settings />,
        children: [
          {
            index: true,
            element: <Navigate to="profile" replace />,
          },
          {
            path: 'profile',
            element: <SettingsProfile />,
          },
          {
            path: 'account',
            element: <SettingsAccount />,
          },
          {
path: '*',
element: <div className="p-4 text-muted-foreground">Settings sub-page placeholder</div>
}
        ]
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  }
]);
