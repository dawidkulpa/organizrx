import type { NzbGetHistoryItem } from './widget-types'
import { formatBytes, getStatusColor } from './widget-utils'

export function HistoryItem({ item }: { item: NzbGetHistoryItem }) {
  const statusColor = getStatusColor(item.Status)
  const date = new Date(item.HistoryTime * 1000).toLocaleString()

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-2 bg-white dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {item.Name}
          </h4>
          <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400 mt-1">
            <span>Size: {formatBytes(item.FileSizeMB)}</span>
            <span>Completed: {date}</span>
            {item.Category && <span>Category: {item.Category}</span>}
          </div>
          <div className={`text-xs font-medium mt-1 ${statusColor}`}>
            {item.Status}
            {item.FailedArticles > 0 && ` • ${item.FailedArticles} failed articles`}
          </div>
        </div>
      </div>
    </div>
  )
}
