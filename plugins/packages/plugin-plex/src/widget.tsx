import { useState, useEffect } from 'react'
import type { ResolvedPlexItem } from './types'

interface PlexWidgetProps {
  widgetId: string
  refreshInterval?: number
}

interface StreamItemProps {
  item: ResolvedPlexItem
}

interface RecentItemProps {
  item: ResolvedPlexItem
}

function StreamItem({ item }: StreamItemProps) {
  const progressPercent = item.watched || 0
  const isTranscoding = item.sessionType === 'Transcoding'

  return (
    <div className="flex flex-col gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="flex items-start gap-3">
        {item.nowPlayingImageURL && (
          <img
            src={item.nowPlayingImageURL}
            alt={item.nowPlayingTitle}
            className="w-20 h-20 object-cover rounded"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate dark:text-white">{item.nowPlayingTitle}</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {item.nowPlayingBottom}
          </p>
          {item.user && (
            <div className="flex items-center gap-2 mt-1">
              {item.userThumb && (
                <img src={item.userThumb} alt={item.user} className="w-5 h-5 rounded-full" />
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {item.user}
                {item.userAddress !== 'x.x.x.x' && ` • ${item.userAddress}`}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {item.state === 'play' ? (
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 4l10 6-10 6V4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 4h3v12H6V4zm5 0h3v12h-3V4z" />
            </svg>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Stream info */}
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className={isTranscoding ? 'text-orange-500' : 'text-green-500'}>
          {item.sessionType}
        </span>
        {item.userStream.videoResolution && (
          <>
            <span>•</span>
            <span>{item.userStream.videoResolution}</span>
          </>
        )}
        {item.userStream.device && (
          <>
            <span>•</span>
            <span>{item.userStream.device}</span>
          </>
        )}
        {item.userStream.throttled && (
          <>
            <span>•</span>
            <span className="text-red-500">Throttled</span>
          </>
        )}
      </div>
    </div>
  )
}

function RecentItem({ item }: RecentItemProps) {
  return (
    <a
      href={item.address}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow"
    >
      {item.imageURL && (
        <img src={item.imageURL} alt={item.title} className="w-full h-40 object-cover" />
      )}
      <div className="p-3">
        <h3 className="font-semibold text-sm truncate dark:text-white">{item.title}</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{item.secondaryTitle}</p>
        {item.addedAt && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Added {new Date(item.addedAt * 1000).toLocaleDateString()}
          </p>
        )}
      </div>
    </a>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="text-center">
        <svg
          className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{message}</p>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  )
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="text-center">
        <svg
          className="w-12 h-12 mx-auto text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    </div>
  )
}

export default function PlexWidget({ widgetId, refreshInterval = 30000 }: PlexWidgetProps) {
  const [items, setItems] = useState<ResolvedPlexItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isStreamsWidget = widgetId === 'plex-streams'
  const isRecentWidget = widgetId === 'plex-recent'

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const endpoint = isStreamsWidget
          ? '/api/plugins/plex/streams'
          : isRecentWidget
            ? '/api/plugins/plex/recent?limit=10'
            : '/api/plugins/plex/playlists'

        const response = await fetch(endpoint)

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`)
        }

        const json = await response.json()

        if (json.error) {
          throw new Error(json.error.message)
        }

        setItems(json.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Set up auto-refresh
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [widgetId, isStreamsWidget, isRecentWidget, refreshInterval])

  if (loading) {
    return <LoadingState />
  }

  if (error) {
    return <ErrorState error={error} />
  }

  if (!items || items.length === 0) {
    const emptyMessage = isStreamsWidget
      ? 'No active streams'
      : isRecentWidget
        ? 'No recent items'
        : 'No playlists'
    return <EmptyState message={emptyMessage} />
  }

  if (isStreamsWidget) {
    return (
      <div className="flex flex-col gap-3 p-4 h-full overflow-y-auto">
        <h2 className="text-lg font-bold dark:text-white">Active Streams</h2>
        {items.map((item) => (
          <StreamItem key={item.uid} item={item} />
        ))}
      </div>
    )
  }

  if (isRecentWidget) {
    return (
      <div className="p-4 h-full overflow-y-auto">
        <h2 className="text-lg font-bold mb-3 dark:text-white">Recently Added</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item) => (
            <RecentItem key={item.uid} item={item} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      <h2 className="text-lg font-bold mb-3 dark:text-white">Playlists</h2>
      <EmptyState message="Playlist view not yet implemented" />
    </div>
  )
}
