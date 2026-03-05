import { AppWindow } from 'lucide-react'
import { cn } from '../../utils'

interface TabIconProps {
  image: string | null
  sidebarOpen: boolean
}

export function TabIcon({ image, sidebarOpen }: TabIconProps) {
  if (image) {
    const src = image.startsWith('http') || image.startsWith('/') ? image : `/images/tabs/${image}`
    return (
      <img
        src={src}
        alt=""
        className={cn('w-5 h-5 shrink-0 rounded-sm object-contain', sidebarOpen && 'mr-3')}
        onError={(e) => {
          const target = e.currentTarget
          target.style.display = 'none'
          const fallback = target.nextElementSibling
          if (fallback) (fallback as HTMLElement).style.display = 'block'
        }}
      />
    )
  }
  return <AppWindow size={20} className={cn('shrink-0', sidebarOpen && 'mr-3')} />
}
