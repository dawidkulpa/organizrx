import { useState, useRef, useEffect } from 'react'
import { useLockscreenStore, useAuthStore } from '../store'
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { cn } from '../utils'
import client from '../api/client'

// ── LockScreen ──────────────────────────────────────────────────
// Overlays the entire app when locked. Does NOT navigate away — the
// underlying page state is preserved beneath the blurred overlay.
export default function LockScreen() {
  const isLocked = useLockscreenStore((s) => s.isLocked)
  const lockPin = useLockscreenStore((s) => s.lockPin)
  const unlock = useLockscreenStore((s) => s.unlock)
  const user = useAuthStore((s) => s.user)

  const [value, setValue] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input when lock screen appears
  useEffect(() => {
    if (isLocked && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isLocked])

  if (!isLocked) return null

  const isPinMode = lockPin.length > 0
  const placeholder = isPinMode ? 'Enter PIN' : 'Enter password'
  const inputType = isPinMode ? 'tel' : showPassword ? 'text' : 'password'

  const handleUnlock = async () => {
    if (!value.trim()) {
      setError(isPinMode ? 'Enter your PIN' : 'Enter your password')
      return
    }

    // PIN mode — local check only
    if (isPinMode) {
      if (value === lockPin) {
        setValue('')
        setError('')
        unlock()
      } else {
        setError('Incorrect PIN')
        setValue('')
      }
      return
    }

    // Password mode — verify with server
    setIsVerifying(true)
    setError('')
    try {
      // If token is still valid, verify password against login endpoint
      await client.post('/auth/login', {
        username: user?.username ?? '',
        password: value,
      })
      setValue('')
      setError('')
      unlock()
    } catch {
      setError('Incorrect password')
      setValue('')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUnlock()
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" />

      {/* Lock card */}
      <div className="relative z-10 w-full max-w-sm mx-4 space-y-6 text-center">
        {/* User avatar */}
        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
          <span className="text-3xl font-bold text-primary-foreground">
            {user?.username?.[0]?.toUpperCase() ?? 'U'}
          </span>
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">{user?.username ?? 'Locked'}</h2>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
            <Lock size={14} />
            Screen locked
          </p>
        </div>

        {/* Input */}
        <div className="space-y-3">
          <div className="relative">
            <input
              ref={inputRef}
              type={inputType}
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setError('')
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              maxLength={isPinMode ? 6 : undefined}
              inputMode={isPinMode ? 'numeric' : undefined}
              pattern={isPinMode ? '[0-9]*' : undefined}
              disabled={isVerifying}
              className={cn(
                'w-full bg-muted/50 border rounded-lg px-4 py-3 text-center text-lg tracking-wider',
                'focus:outline-none focus:ring-2 focus:ring-primary transition-all',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                error ? 'border-destructive' : 'border-border',
                isPinMode && 'font-mono text-2xl tracking-[0.5em]',
              )}
              autoComplete="off"
            />

            {!isPinMode && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive animate-shake">{error}</p>
          )}

          <button
            type="button"
            onClick={handleUnlock}
            disabled={isVerifying || !value.trim()}
            className={cn(
              'w-full py-3 rounded-lg font-medium text-sm transition-all',
              'bg-primary text-primary-foreground hover:bg-primary/90',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-center gap-2',
            )}
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              'Unlock'
            )}
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          {isPinMode ? 'Enter your PIN to unlock' : 'Enter your password to unlock'}
        </p>
      </div>
    </div>
  )
}
