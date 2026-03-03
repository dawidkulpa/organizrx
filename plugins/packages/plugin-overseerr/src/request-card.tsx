import type { OverseerrRequest } from './widget'
import { getRequesterName, getPosterUrl, getStatusText, getStatusColor, formatDate } from './utils'

interface RequestCardProps {
  request: OverseerrRequest
  isAdmin: boolean
  actionLoading: number | null
  onApprove: (id: number) => void
  onDeny: (id: number) => void
}

export function RequestCard({
  request,
  isAdmin,
  actionLoading,
  onApprove,
  onDeny,
}: RequestCardProps) {
  return (
    <div
      key={request.id}
      className="flex gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
    >
      {/* Poster */}
      <div className="flex-shrink-0">
        <img
          src={getPosterUrl(request)}
          alt="Media poster"
          className="w-16 h-24 object-cover rounded shadow-sm"
          loading="lazy"
        />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {request.media.tmdbId}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Requested by {getRequesterName(request)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {formatDate(request.createdAt)}
            </p>
          </div>

          {/* Media type badge */}
          <span
            className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
              request.type === 'movie'
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            }`}
          >
            {request.type === 'movie' ? 'Movie' : 'TV'}
          </span>
        </div>

        {/* Status badge */}
        <div className="mt-2">
          <span
            className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${getStatusColor(
              request
            )}`}
          >
            {getStatusText(request)}
          </span>
        </div>

        {/* Action buttons (admin only) */}
        {isAdmin && request.status === 1 && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onApprove(request.id)}
              disabled={actionLoading === request.id}
              className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {actionLoading === request.id ? 'Processing...' : 'Approve'}
            </button>
            <button
              onClick={() => onDeny(request.id)}
              disabled={actionLoading === request.id}
              className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {actionLoading === request.id ? 'Processing...' : 'Deny'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
