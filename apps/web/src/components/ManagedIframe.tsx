import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '../utils'
import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-react'

interface ManagedIframeProps {
  src: string
  title: string
  tabId: number
  isActive: boolean
  iframeBlocked?: boolean
  preload?: boolean
  timeoutMs?: number
  splash?: boolean
  onError?: () => void
}

type LoadErrorState = 'blocked' | 'timeout' | null

export default function ManagedIframe({
  src,
  title,
  tabId,
  isActive,
  iframeBlocked = false,
  preload = false,
  timeoutMs,
  splash = true,
  onError,
}: ManagedIframeProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<LoadErrorState>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const effectiveTimeoutMs = timeoutMs && timeoutMs > 0 ? timeoutMs : splash ? 30000 : 10000

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = undefined
    }
  }, [])

  const handleLoad = useCallback(() => {
    clearTimeoutRef()
    setIsLoading(false)
    setLoadError(null)
  }, [clearTimeoutRef])

  const handleError = useCallback(() => {
    clearTimeoutRef()
    setIsLoading(false)
    setLoadError('blocked')
    onError?.()
  }, [clearTimeoutRef, onError])

  const handleRetry = useCallback(() => {
    clearTimeoutRef()
    setLoadError(null)
    setIsLoading(true)
    setReloadKey((currentKey) => currentKey + 1)
  }, [clearTimeoutRef])

  useEffect(() => {
    if (iframeBlocked) {
      clearTimeoutRef()
      setIsLoading(false)
      setLoadError('blocked')
      return
    }

    setIsLoading(true)
    setLoadError(null)
  }, [src, reloadKey, iframeBlocked, clearTimeoutRef])

  useEffect(() => {
    if (!isActive || !isLoading || loadError !== null) {
      clearTimeoutRef()
      return
    }

    timeoutRef.current = setTimeout(() => {
      setIsLoading(false)
      setLoadError('timeout')
      onError?.()
    }, effectiveTimeoutMs)

    return clearTimeoutRef
  }, [clearTimeoutRef, effectiveTimeoutMs, isActive, isLoading, loadError, onError])

  return (
    <div
      className={cn('relative h-full w-full overflow-hidden bg-background', !isActive && 'hidden')}
      data-tab-id={tabId}
    >
      {isLoading && isActive && splash && (
        <div
          data-testid="iframe-loading-overlay"
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm"
        >
          <div className="flex min-w-64 max-w-sm flex-col items-center gap-4 rounded-3xl border border-border/70 bg-card/90 px-8 py-7 text-center shadow-2xl shadow-black/10">
            <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
              OrganizrX
            </div>
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-primary/15 bg-background/80">
              <div className="absolute inset-1 rounded-full border border-primary/10" />
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-foreground">{title}</p>
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                Loading tab
              </p>
            </div>
          </div>
        </div>
      )}

      {loadError !== null && isActive && (
        <div
          data-testid="iframe-error-overlay"
          role="alert"
          className="absolute inset-0 z-20 flex h-full w-full flex-col items-center justify-center gap-4 bg-background p-8"
        >
           <div
             className={cn(
               'flex h-16 w-16 items-center justify-center rounded-full',
               iframeBlocked ? 'bg-warning/10' : 'bg-destructive/10'
             )}
           >
             <AlertTriangle
               className={cn('h-8 w-8', iframeBlocked ? 'text-warning' : 'text-destructive')}
             />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {loadError === 'timeout'
              ? 'This tab took too long to load'
              : iframeBlocked
                ? 'This site blocks iframe embedding'
                : 'Unable to Load Content'}
          </h3>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            {loadError === 'timeout'
              ? 'The remote service did not finish loading before the timeout elapsed. You can try again or open it in a new tab.'
              : iframeBlocked
                ? 'The remote server disallows loading this page inside dashboards for security reasons.'
                : 'This page cannot be embedded, likely due to security restrictions set by the remote server.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {loadError === 'timeout' && !iframeBlocked && (
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Retry
              </button>
            )}
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <ExternalLink className="h-4 w-4" />
              Open in New Tab
            </a>
          </div>
        </div>
      )}

      {!iframeBlocked && (
        <iframe
          key={`${tabId}-${reloadKey}`}
          src={src}
          title={title}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          loading={preload ? 'eager' : 'lazy'}
          onLoad={handleLoad}
          onError={handleError}
          className="h-full w-full border-0 bg-background"
        />
      )}
    </div>
  )
}
