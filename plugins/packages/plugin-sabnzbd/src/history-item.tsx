import type { SabnzbdHistorySlot } from './types'

export function HistoryItem({ slot }: { slot: SabnzbdHistorySlot }) {
  const statusColor =
    slot.status === 'Completed'
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400'
  const date = new Date(slot.completed * 1000).toLocaleString()

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-2 bg-white dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {slot.name}
          </h4>
          <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400 mt-1">
            <span>Size: {slot.size}</span>
            <span>Completed: {date}</span>
            {slot.category && <span>Category: {slot.category}</span>}
          </div>
          <div className={`text-xs font-medium mt-1 ${statusColor}`}>
            {slot.status}
            {slot.fail_message && ` - ${slot.fail_message}`}
          </div>
        </div>
      </div>
    </div>
  )
}
