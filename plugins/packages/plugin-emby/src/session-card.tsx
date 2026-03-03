import type { EmbySession } from './types'
import { formatTicks } from './utils'

interface SessionCardProps {
  session: EmbySession
}

export function SessionCard({ session }: SessionCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {session.PlayState?.IsPaused ? (
            <svg className="h-8 w-8 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="h-8 w-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {session.NowPlayingItem?.Name || 'Unknown'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {session.UserName} · {session.Client} · {session.DeviceName}
          </p>
          {session.PlayState?.PositionTicks && session.NowPlayingItem?.RunTimeTicks && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (session.PlayState.PositionTicks / session.NowPlayingItem.RunTimeTicks) * 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>{formatTicks(session.PlayState.PositionTicks)}</span>
                <span>{formatTicks(session.NowPlayingItem.RunTimeTicks)}</span>
              </div>
            </div>
          )}
          {session.TranscodingInfo && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                Transcoding
              </span>
              {session.TranscodingInfo.CompletionPercentage !== undefined &&
                session.TranscodingInfo.CompletionPercentage < 100 && (
                  <span className="text-gray-500 dark:text-gray-400">
                    {Math.floor(session.TranscodingInfo.CompletionPercentage)}%
                  </span>
                )}
            </div>
          )}
          {session.PlayState?.PlayMethod === 'DirectPlay' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 mt-2">
              Direct Play
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
