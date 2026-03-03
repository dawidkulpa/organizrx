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
  isAuthenticated: boolean
  isLoading: boolean
  isInitializing: boolean
  login: (username: string, password: string, rememberMe?: boolean) => Promise<LoginResult>
  logout: () => Promise<void>
  refresh: () => Promise<boolean>
  initSession: () => Promise<void>
  setToken: (token: string | null) => void
  setUser: (user: AuthUser | null) => void
  clearAuth: () => void
}

const initialAuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true,
}

export const useAuthStore = create<AuthState>((set) => ({
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
    try {
      await client.post('/auth/logout')
    } catch {
      // Logout best-effort — clear local state regardless
    }
    set({ ...initialAuthState, isInitializing: false })
  },

  refresh: async () => {
    try {
      const res = await client.post('/auth/refresh')
      const { data } = res.data
      set({
        token: data.accessToken,
      })
      return true
    } catch {
      set({ ...initialAuthState, isInitializing: false })
      return false
    }
  },

  setToken: (token) => set({ token, isAuthenticated: !!token }),
  setUser: (user) => set({ user }),
  clearAuth: () => set({ ...initialAuthState, isInitializing: false }),

  initSession: async () => {
    try {
      const res = await client.post('/auth/refresh')
      const { data } = res.data
      // Fetch the full user profile after restoring session
      const meRes = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      })
      set({
        token: data.accessToken,
        user: meRes.data.data.user,
        isAuthenticated: true,
        isInitializing: false,
      })
    } catch {
      set({ ...initialAuthState, isInitializing: false })
    }
  },
}))

// ── Theme Store ─────────────────────────────────────────────────
export type ThemeMode = 'dark' | 'light' | 'system'

interface ThemeState {
  theme: ThemeMode
  accentColor: string
  customCss: string
  setTheme: (theme: ThemeMode) => void
  setAccentColor: (color: string) => void
  setCustomCss: (css: string) => void
}

const THEME_STORAGE_KEY = 'organizrx-theme'
const ACCENT_STORAGE_KEY = 'organizrx-accent'
const CSS_STORAGE_KEY = 'organizrx-custom-css'

function readLocalStorage(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function writeLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage unavailable (private browsing, quota exceeded)
  }
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: readLocalStorage(THEME_STORAGE_KEY, 'dark') as ThemeMode,
  accentColor: readLocalStorage(ACCENT_STORAGE_KEY, ''),
  customCss: readLocalStorage(CSS_STORAGE_KEY, ''),

  setTheme: (theme) => {
    writeLocalStorage(THEME_STORAGE_KEY, theme)
    set({ theme })
  },

  setAccentColor: (color) => {
    writeLocalStorage(ACCENT_STORAGE_KEY, color)
    set({ accentColor: color })
  },

  setCustomCss: (css) => {
    writeLocalStorage(CSS_STORAGE_KEY, css)
    set({ customCss: css })
  },
}))

// ── Lock Screen Store ─────────────────────────────────────────────
const DEFAULT_IDLE_TIMEOUT = 15 * 60 * 1000 // 15 minutes
const LOCK_TIMEOUT_KEY = 'organizrx-lock-timeout'
const LOCK_PIN_KEY = 'organizrx-lock-pin'

interface LockscreenState {
  isLocked: boolean
  lockPin: string
  idleTimeout: number // milliseconds
  lock: () => void
  unlock: () => void
  setLockPin: (pin: string) => void
  setIdleTimeout: (ms: number) => void
}

export const useLockscreenStore = create<LockscreenState>((set) => ({
  isLocked: false,
  lockPin: readLocalStorage(LOCK_PIN_KEY, ''),
  idleTimeout: Number(readLocalStorage(LOCK_TIMEOUT_KEY, String(DEFAULT_IDLE_TIMEOUT))) || DEFAULT_IDLE_TIMEOUT,

  lock: () => set({ isLocked: true }),
  unlock: () => set({ isLocked: false }),

  setLockPin: (pin) => {
    writeLocalStorage(LOCK_PIN_KEY, pin)
    set({ lockPin: pin })
  },

  setIdleTimeout: (ms) => {
    writeLocalStorage(LOCK_TIMEOUT_KEY, String(ms))
    set({ idleTimeout: ms })
  },
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
