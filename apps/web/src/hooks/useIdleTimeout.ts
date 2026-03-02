import { useEffect, useRef, useCallback } from 'react'
import { useLockscreenStore, useAuthStore } from '../store'

const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'pointerdown',
]

// ── useIdleTimeout ──────────────────────────────────────────────
// Call once in the app shell (Layout). Monitors user activity and
// locks the screen after the configured idle timeout.
export function useIdleTimeout() {
  const idleTimeout = useLockscreenStore((s) => s.idleTimeout)
  const lock = useLockscreenStore((s) => s.lock)
  const isLocked = useLockscreenStore((s) => s.isLocked)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!isAuthenticated || isLocked) return

    timerRef.current = setTimeout(() => {
      lock()
    }, idleTimeout)
  }, [idleTimeout, lock, isAuthenticated, isLocked])

  useEffect(() => {
    if (!isAuthenticated || isLocked || idleTimeout <= 0) return

    resetTimer()

    const handler = () => resetTimer()
    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, handler, { passive: true })
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, handler)
      }
    }
  }, [isAuthenticated, isLocked, idleTimeout, resetTimer])
}
