import { useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store'

// ── JWT expiry parser (no external deps) ─────────────────────────
function getTokenExpiry(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1]))
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

// ── useAutoRefresh ───────────────────────────────────────────────
// Call once in the app shell (Layout). Automatically refreshes the
// access token 60 seconds before it expires.
export function useAutoRefresh() {
  const token = useAuthStore((s) => s.token)
  const refresh = useAuthStore((s) => s.refresh)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const scheduleRefresh = useCallback(
    (accessToken: string) => {
      const exp = getTokenExpiry(accessToken)
      if (!exp) return

      const nowSec = Math.floor(Date.now() / 1000)
      const refreshInMs = Math.max((exp - nowSec - 60) * 1000, 0)

      if (timerRef.current) clearTimeout(timerRef.current)

      timerRef.current = setTimeout(async () => {
        const success = await refresh()
        if (!success) return
        // After refresh, the store updates token — the effect below re-runs
      }, refreshInMs)
    },
    [refresh],
  )

  useEffect(() => {
    if (token) {
      scheduleRefresh(token)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [token, scheduleRefresh])
}

// ── useSessionInit ──────────────────────────────────────────────
// Call once at the app root. Attempts to restore an authenticated
// session by hitting /auth/refresh (httpOnly cookie auto-sent).
export function useSessionInit() {
  const initSession = useAuthStore((s) => s.initSession)
  const calledRef = useRef(false)

  useEffect(() => {
    if (calledRef.current) return
    calledRef.current = true
    initSession()
  }, [initSession])
}

// ── useAuthGuard ─────────────────────────────────────────────────
// Redirects unauthenticated users to /login.
// Returns current auth loading / authenticated state.
export function useAuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!isLoading && !isAuthenticated && location.pathname !== '/login') {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate, location.pathname])

  return { isAuthenticated, isLoading }
}
