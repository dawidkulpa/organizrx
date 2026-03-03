import type { SonarrQueueRecord } from './types'
import { formatEpisode, formatBytes, formatTimeLeft, getStatusColor } from './utils'

interface QueueRecordProps {
  item: SonarrQueueRecord
}

export function QueueRecordCard({ item }: QueueRecordProps) {
  const progress = item.size > 0 ? ((item.size - item.sizeleft) / item.size) * 100 : 0

  return (
    <div key={item.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate mb-1">
            {item.series.title}
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
            {formatEpisode(item.episode.seasonNumber, item.episode.episodeNumber)} -{' '}
            {item.episode.title}
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className={getStatusColor(item.status)}>{item.status}</span>
            {item.quality?.quality?.name && (
              <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
                {item.quality.quality.name}
              </span>
            )}
            <span>{formatBytes(item.size)}</span>
            {item.timeleft && <span>ETA: {formatTimeLeft(item.timeleft)}</span>}
          </div>
        </div>
      </div>
      <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-blue-500 dark:bg-blue-400 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-right text-gray-500 dark:text-gray-400">
        {progress.toFixed(1)}%
      </div>
    </div>
  )
}
