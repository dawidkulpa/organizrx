import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '../utils'
import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-react'

interface ManagedIframeProps {
  src: string
  title: string
  tabId: number
  isActive: boolean
  timeoutMs?: number
  onError?: () => void
}

export default function ManagedIframe({
  src,
  title,
  tabId,
  isActive,
  timeoutMs = 10000,
  onError,
}: ManagedIframeProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const handleLoad = useCallback(() => {
    setIsLoading(false)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  const handleError = useCallback(() => {
    setIsLoading(false)
    setHasError(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    onError?.()
  }, [onError])

  // Timeout-based error detection for X-Frame-Options blocks
  // (browser won't fire onError for these)
  useEffect(() => {
    if (!isActive || hasError) return

    setIsLoading(true)
    setHasError(false)

    timeoutRef.current = setTimeout(() => {
      // If still loading after timeout, assume blocked
      setIsLoading((loading) => {
        if (loading) {
          setHasError(true)
          onError?.()
        }
        return false
      })
    }, timeoutMs)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [src, isActive, timeoutMs, onError, hasError])

  if (hasError && isActive) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-background p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Unable to Load Content</h3>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          This page cannot be embedded, likely due to security restrictions set by the remote server.
        </p>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          Open in New Tab
        </a>
      </div>
    )
  }

  return (
    <div
      className={cn('relative h-full w-full', !isActive && 'hidden')}
      data-tab-id={tabId}
    >
      {/* Loading skeleton */}
      {isLoading && isActive && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading {title}…</p>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
        className="h-full w-full border-0"
      />
    </div>
  )
}
