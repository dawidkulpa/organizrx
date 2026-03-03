import type { RadarrQueueItem } from './types'

interface QueueItemProps {
  item: RadarrQueueItem
}

export function QueueItemCard({ item }: QueueItemProps) {
  const progress = item.size > 0 ? ((item.size - item.sizeleft) / item.size) * 100 : 0
  const progressColor =
    progress >= 100 ? 'bg-green-500' : progress > 0 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'

  return (
    <div
      key={item.id}
      className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex-grow">
          {item.movie?.title || item.title}
          {item.movie?.year && (
            <span className="text-gray-500 dark:text-gray-400 ml-1">({item.movie.year})</span>
          )}
        </h4>
        <span className="text-xs text-gray-600 dark:text-gray-400 ml-2">
          {progress.toFixed(1)}%
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
        <div
          className={`${progressColor} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
        <span>{item.quality.quality.name}</span>
        <span className="capitalize">{item.status.replace(/([A-Z])/g, ' $1').trim()}</span>
      </div>
      {item.timeleft && (
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          ⏱ {item.timeleft} remaining
        </div>
      )}
    </div>
  )
}
