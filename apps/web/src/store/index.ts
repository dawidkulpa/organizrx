import { create } from 'zustand'
import type { AuthUser } from '@organizrx/shared'
import client from '../api/client'

// ── Login result discriminated union ──────────────────────────────
export type LoginResult =
  | { ok: true; user: AuthUser }
  | { ok: false; requires2fa: true; tempToken: string }
  | { ok: false; requires2fa: false; error: string }

// ── Auth Store ───────────────────────────────────────────────────
interface AuthState {
  user: AuthUser | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string, rememberMe?: boolean) => Promise<LoginResult>
  logout: () => Promise<void>
  refresh: () => Promise<boolean>
  setToken: (token: string | null) => void
  setUser: (user: AuthUser | null) => void
  setRefreshToken: (token: string | null) => void
  clearAuth: () => void
}

const initialAuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...initialAuthState,

  login: async (username, password, rememberMe) => {
    set({ isLoading: true })
    try {
      const res = await client.post('/auth/login', { username, password, rememberMe })
      const { data } = res.data

      if (data.requires_2fa) {
        set({ isLoading: false })
        return { ok: false as const, requires2fa: true as const, tempToken: data.temp_token }
      }

      set({
        token: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      })
      return { ok: true as const, user: data.user }
    } catch (err: unknown) {
      set({ isLoading: false })
      const message =
        err instanceof Error
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data
              ?.error?.message ?? err.message
          : 'Login failed'
      return { ok: false as const, requires2fa: false as const, error: message }
    }
  },

  logout: async () => {
    const { refreshToken: rt } = get()
    try {
      await client.post('/auth/logout', { refreshToken: rt ?? undefined })
    } catch {
      // Logout best-effort — clear local state regardless
    }
    set(initialAuthState)
  },

  refresh: async () => {
    const { refreshToken: rt } = get()
    if (!rt) return false

    try {
      const res = await client.post('/auth/refresh', { refreshToken: rt })
      const { data } = res.data
      set({
        token: data.accessToken,
        refreshToken: data.refreshToken,
      })
      return true
    } catch {
      set(initialAuthState)
      return false
    }
  },

  setToken: (token) => set({ token, isAuthenticated: !!token }),
  setUser: (user) => set({ user }),
  setRefreshToken: (refreshToken) => set({ refreshToken }),
  clearAuth: () => set(initialAuthState),
}))

// ── Theme Store (placeholder — T32 will expand) ─────────────────
interface ThemeState {
  theme: 'dark' | 'light' | 'system'
  setTheme: (theme: 'dark' | 'light' | 'system') => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
}))

// ── Lock Screen Store (placeholder — T33 will expand) ───────────
interface LockscreenState {
  isLocked: boolean
  lock: () => void
  unlock: () => void
}

export const useLockscreenStore = create<LockscreenState>((set) => ({
  isLocked: false,
  lock: () => set({ isLocked: true }),
  unlock: () => set({ isLocked: false }),
}))

// ── UI Store ─────────────────────────────────────────────────────
interface UIState {
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
