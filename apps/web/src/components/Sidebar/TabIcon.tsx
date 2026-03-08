import { AppWindow } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../utils'
import { useTabPingStore } from '../../store/tab-ping'

interface TabIconProps {
  tabId: number
  image: string | null
  sidebarOpen: boolean
}

function getDotClassName(
  result:
    | {
        reachable: boolean
        iframeAllowed: boolean
      }
    | undefined
): string {
  if (!result) {
    return 'bg-muted-foreground/40'
  }

  if (!result.reachable) {
    return 'bg-destructive'
  }

  if (!result.iframeAllowed) {
    return 'bg-yellow-500'
  }

  return 'bg-emerald-500'
}

export function TabIcon({ tabId, image, sidebarOpen }: TabIconProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const pingResult = useTabPingStore((state) => state.results[tabId])
  const dotClassName = getDotClassName(pingResult)
  const iconClassName = cn('w-5 h-5 shrink-0 rounded-sm object-contain', sidebarOpen && 'mr-3')
  const src =
    image && (image.startsWith('http') || image.startsWith('/') ? image : `/images/tabs/${image}`)

  return (
    <div className="relative inline-flex">
      {src && !imageFailed ? (
        <img src={src} alt="" className={iconClassName} onError={() => setImageFailed(true)} />
      ) : (
        <AppWindow size={20} className={cn('shrink-0', sidebarOpen && 'mr-3')} />
      )}
      <span
        aria-hidden="true"
        data-testid={`ping-dot-${tabId}`}
        className={cn(
          'absolute -right-1 -bottom-1 h-2.5 w-2.5 rounded-full border border-background',
          dotClassName
        )}
      />
    </div>
  )
}
