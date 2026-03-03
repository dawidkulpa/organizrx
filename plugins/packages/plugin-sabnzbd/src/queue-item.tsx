import type { SabnzbdSlot } from './types'
import { formatTime } from './utils'

export function QueueItem({
  slot,
  onPause,
  onResume,
}: {
  slot: SabnzbdSlot
  onPause: (id: string) => void
  onResume: (id: string) => void
}) {
  const percentage = parseFloat(slot.percentage)
  const isPaused = slot.status === 'Paused'

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-2 bg-white dark:bg-gray-800">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {slot.filename}
          </h4>
          <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400 mt-1">
            <span>Size: {slot.size}</span>
            <span>ETA: {formatTime(slot.timeleft)}</span>
            {slot.category && <span>Category: {slot.category}</span>}
          </div>
        </div>
        <button
          onClick={() => (isPaused ? onResume(slot.nzo_id) : onPause(slot.nzo_id))}
          className={`ml-2 px-3 py-1 text-xs rounded transition-colors ${
            isPaused
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-yellow-500 hover:bg-yellow-600 text-white'
          }`}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
      </div>
      <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-blue-500 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
        <span>{percentage.toFixed(1)}%</span>
        <span>{slot.sizeleft} remaining</span>
      </div>
    </div>
  )
}
