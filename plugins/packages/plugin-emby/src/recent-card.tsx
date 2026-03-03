import type { EmbyItem } from './types'

interface RecentCardProps {
  item: EmbyItem
}

export function RecentCard({ item }: RecentCardProps) {
  return (
    <div className="group relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <div className="aspect-[2/3] bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
        <svg
          className="h-12 w-12 text-gray-400 dark:text-gray-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          {item.Type === 'Movie' || item.Type === 'Video' ? (
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          ) : item.Type === 'Series' || item.Type === 'Episode' ? (
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          ) : (
            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
          )}
        </svg>
      </div>
      <div className="p-2">
        <p
          className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate"
          title={item.Name}
        >
          {item.Name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {item.ProductionYear || item.Type}
        </p>
      </div>
    </div>
  )
}
