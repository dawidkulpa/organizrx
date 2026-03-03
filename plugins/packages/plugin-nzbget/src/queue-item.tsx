import type { NzbGetGroup } from './widget-types'
import { formatBytes, formatSpeed, formatTime, getStatusColor } from './widget-utils'

export function QueueItem({
  group,
  onPause,
  onResume,
}: {
  group: NzbGetGroup
  onPause: (id: number) => void
  onResume: (id: number) => void
}) {
  const percentage = (group.DownloadedSizeMB / group.FileSizeMB) * 100
  const isPaused = group.Status === 'PAUSED'
  const remainingTime =
    group.DownloadRate > 0 ? (group.RemainingSizeMB * 1024 * 1024) / group.DownloadRate : 0

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-2 bg-white dark:bg-gray-800">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {group.NZBName}
          </h4>
          <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400 mt-1">
            <span>Size: {formatBytes(group.FileSizeMB)}</span>
            <span>ETA: {formatTime(remainingTime)}</span>
            {group.Category && <span>Category: {group.Category}</span>}
          </div>
          <div className={`text-xs font-medium mt-1 ${getStatusColor(group.Status)}`}>
            {group.Status}
            {group.DownloadRate > 0 && ` • ${formatSpeed(group.DownloadRate)}`}
          </div>
        </div>
        <button
          onClick={() => (isPaused ? onResume(group.NZBID) : onPause(group.NZBID))}
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
        <span>{formatBytes(group.RemainingSizeMB)} remaining</span>
      </div>
    </div>
  )
}
