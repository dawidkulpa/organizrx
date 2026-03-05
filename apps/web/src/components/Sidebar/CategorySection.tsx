import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '../../utils'
import { SidebarCategory, SidebarTab } from './use-sidebar'
import { TabNavItem } from './TabNavItem'

interface CategorySectionProps {
  category: SidebarCategory
  tabs: SidebarTab[]
  sidebarOpen: boolean
}

export function CategorySection({ category, tabs, sidebarOpen }: CategorySectionProps) {
  const [expanded, setExpanded] = useState(true)

  if (tabs.length === 0) return null

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex items-center w-full px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-wider',
          'text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200',
          !sidebarOpen && 'justify-center'
        )}
      >
        {sidebarOpen ? (
          <>
            <span className="flex-1 text-left truncate">{category.name}</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </>
        ) : (
          <span className="text-[10px]" title={category.name}>
            {category.name.charAt(0)}
          </span>
        )}
      </button>

      {(expanded || !sidebarOpen) && (
        <div className="space-y-0.5">
          {tabs.map((tab) => (
            <TabNavItem key={tab.id} tab={tab} sidebarOpen={sidebarOpen} />
          ))}
        </div>
      )}
    </div>
  )
}
