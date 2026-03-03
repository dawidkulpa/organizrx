import { useState, useCallback } from 'react'
import { cn } from '../utils'
import { Loader2, AppWindow, AlertCircle } from 'lucide-react'

export interface TabData {
  id: number
  name: string | null
  url: string | null
  url_local: string | null
  type: number | null
  enabled: number | null
  image: string | null
}

interface TabContentProps {
  tab: TabData | null
  isLoading?: boolean
}

export default function TabContent({ tab, isLoading }: TabContentProps) {
  const [iframeLoading, setIframeLoading] = useState(true)

  const handleIframeLoad = useCallback(() => {
    setIframeLoading(false)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!tab || tab.enabled === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <AlertCircle className="h-12 w-12" />
        <h2 className="text-xl font-medium">Tab not found</h2>
        <p className="text-sm">This tab doesn&apos;t exist or has been disabled.</p>
      </div>
    )
  }

  // type === 1: iframe (external service) — legacy Organizr uses 1 for iframe tabs
  // type === 0: internal page (built-in Organizr API pages)
  if (tab.type === 1) {
    const src = tab.url || tab.url_local
    if (!src) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
          <AlertCircle className="h-12 w-12" />
          <h2 className="text-xl font-medium">No URL configured</h2>
          <p className="text-sm">This tab has no URL set.</p>
        </div>
      )
    }

    return (
      <div className="relative w-full h-full">
        {iframeLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading {tab.name}...</p>
            </div>
          </div>
        )}
        <iframe
          src={src}
          title={tab.name ?? 'Tab content'}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          className={cn(
            'w-full h-full border-0 transition-opacity duration-300',
            iframeLoading ? 'opacity-0' : 'opacity-100'
          )}
          onLoad={handleIframeLoad}
        />
      </div>
    )
  }

  // type === 0 or other: internal/native component
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="p-6 rounded-xl border border-border bg-card shadow-sm max-w-md w-full text-center">
        <AppWindow className="h-10 w-10 mx-auto mb-4 text-primary" />
        <h2 className="text-xl font-semibold mb-2">{tab.name ?? 'Internal Page'}</h2>
        <p className="text-sm text-muted-foreground">
          This is a built-in page. Native component rendering will be available soon.
        </p>
      </div>
    </div>
  )
}
