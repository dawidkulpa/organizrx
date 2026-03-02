import { useEffect, useRef } from 'react'
import { useThemeStore } from '../store'
import type { ThemeMode } from '../store'

// ── Resolved theme (never 'system') ─────────────────────────────
function resolveTheme(theme: ThemeMode): 'dark' | 'light' {
  if (theme !== 'system') return theme
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// ── useTheme ────────────────────────────────────────────────────
// Call once in the app shell (Layout or App). Applies the theme
// class to <html>, injects custom CSS, and sets accent color as a
// CSS custom property.
export function useTheme() {
  const theme = useThemeStore((s) => s.theme)
  const accentColor = useThemeStore((s) => s.accentColor)
  const customCss = useThemeStore((s) => s.customCss)
  const styleRef = useRef<HTMLStyleElement | null>(null)
  const accentStyleRef = useRef<HTMLStyleElement | null>(null)

  // ── Apply dark/light class to <html> ──────────────────────────
  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const resolved = resolveTheme(theme)
      root.classList.remove('dark', 'light')
      root.classList.add(resolved)
    }

    apply()

    // Listen for system preference changes when theme is 'system'
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => apply()
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
    return undefined
  }, [theme])

  // ── Inject custom CSS ─────────────────────────────────────────
  useEffect(() => {
    if (!styleRef.current) {
      const el = document.createElement('style')
      el.setAttribute('data-organizrx', 'custom-css')
      document.head.appendChild(el)
      styleRef.current = el
    }
    styleRef.current.textContent = customCss
    return () => {
      if (styleRef.current) {
        styleRef.current.remove()
        styleRef.current = null
      }
    }
  }, [customCss])

  // ── Apply accent color override ───────────────────────────────
  useEffect(() => {
    if (!accentStyleRef.current) {
      const el = document.createElement('style')
      el.setAttribute('data-organizrx', 'accent-color')
      document.head.appendChild(el)
      accentStyleRef.current = el
    }
    if (accentColor) {
      accentStyleRef.current.textContent = `:root { --color-accent: ${accentColor}; --color-accent-foreground: hsl(0 0% 100%); }`
    } else {
      accentStyleRef.current.textContent = ''
    }
    return () => {
      if (accentStyleRef.current) {
        accentStyleRef.current.remove()
        accentStyleRef.current = null
      }
    }
  }, [accentColor])

  return { resolvedTheme: resolveTheme(theme), theme }
}
