import type { TautulliHistoryItem } from './types'
import { formatDuration } from './format-utils'
import { getMediaTitle, getRelativeTime } from './helpers'

interface HistoryItemProps {
  item: TautulliHistoryItem
}

export function HistoryItem({ item }: HistoryItemProps) {
  const watchedDate = new Date(item.stopped * 1000)
  const relativeTime = getRelativeTime(watchedDate)

  return (
    <div key={item.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {item.thumb ? (
            <img src={item.thumb} alt={item.title} className="w-12 h-16 object-cover rounded" />
          ) : (
            <div className="w-12 h-16 bg-gray-700 rounded flex items-center justify-center text-gray-500 text-xl">
              {item.media_type === 'movie' ? '🎬' : item.media_type === 'episode' ? '📺' : '🎵'}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium truncate text-sm">{getMediaTitle(item)}</div>
          <div className="text-xs text-gray-400 mt-1">
            {item.friendly_name || item.user} • {relativeTime}
          </div>
          <div className="flex gap-2 mt-1 text-xs text-gray-500">
            <span>{item.platform}</span>
            <span>•</span>
            <span>{formatDuration(item.duration)}</span>
            {item.percent_complete < 90 && (
              <>
                <span>•</span>
                <span>{item.percent_complete}% watched</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
