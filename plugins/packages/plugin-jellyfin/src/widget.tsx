import { useState, useEffect } from 'react'
import type { NormalizedSession, NormalizedMediaItem } from './types'
import type { NormalizedSession, NormalizedMediaItem } from './shared'

interface JellyfinWidgetProps {
  pluginId: string
  widgetId: string
  apiBaseUrl: string
}

interface SessionsState {
  sessions: NormalizedSession[]
  loading: boolean
  error: string | null
}

interface LatestState {
  items: NormalizedMediaItem[]
  loading: boolean
  error: string | null
}

// ---------------------------------------------------------------------------
// Sessions Widget — Active Streams
// ---------------------------------------------------------------------------
export function JellyfinSessionsWidget({ apiBaseUrl }: JellyfinWidgetProps) {
  const [state, setState] = useState<SessionsState>({
    sessions: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let mounted = true
    let intervalId: ReturnType<typeof setInterval> | null = null

    const fetchSessions = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/sessions`)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const json = await response.json()
        if (mounted) {
          setState({ sessions: json.data || [], loading: false, error: null })
        }
      } catch (err) {
        if (mounted) {
          setState((prev) => ({ ...prev, loading: false, error: String(err) }))
        }
      }
    }

    fetchSessions()
    intervalId = setInterval(fetchSessions, 10000) // Refresh every 10 seconds

    return () => {
      mounted = false
      if (intervalId) clearInterval(intervalId)
    }
  }, [apiBaseUrl])

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" />
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="flex items-center justify-center h-full p-4 text-center">
        <div className="text-red-600 dark:text-red-400">
          <p className="font-semibold">Error loading sessions</p>
          <p className="text-sm mt-1">{state.error}</p>
        </div>
      </div>
    )
  }

  if (state.sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p>No active streams</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {state.sessions.map((session) => (
        <div
          key={session.sessionId}
          className="flex gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          {/* Poster Image */}
          <div className="flex-shrink-0 w-16 h-24 rounded overflow-hidden bg-gray-200 dark:bg-gray-700">
            {session.posterUrl ? (
              <img
                src={session.posterUrl}
                alt={session.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span className="text-2xl">📺</span>
              </div>
            )}
          </div>

          {/* Session Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100">
                  {session.title}
                </h3>
                {session.secondaryTitle && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {session.secondaryTitle}
                  </p>
                )}
                {session.user && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{session.user}</p>
                )}
              </div>
              <div className="flex-shrink-0">
                {session.state === 'play' ? (
                  <span className="text-green-600 dark:text-green-400">▶</span>
                ) : (
                  <span className="text-yellow-600 dark:text-yellow-400">⏸</span>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-2 space-y-1">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, session.progress))}%` }}
                />
              </div>
              {session.streamMethod === 'Transcode' && session.transcodeProgress < 100 && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                  <div
                    className="bg-orange-500 dark:bg-orange-400 h-1 rounded-full transition-all"
                    style={{ width: `${session.transcodeProgress}%` }}
                  />
                </div>
              )}
            </div>

            {/* Stream Info */}
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
              <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
                {session.client}
              </span>
              {session.streamMethod && (
                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
                  {session.streamMethod}
                </span>
              )}
              {session.videoCodec && (
                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
                  {session.videoCodec.toUpperCase()}
                </span>
              )}
              {session.bandwidth && (
                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
                  {session.bandwidth} Mbps
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recent Media Widget
// ---------------------------------------------------------------------------
export function JellyfinRecentWidget({ apiBaseUrl }: JellyfinWidgetProps) {
  const [state, setState] = useState<LatestState>({
    items: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let mounted = true
    let intervalId: ReturnType<typeof setInterval> | null = null

    const fetchLatest = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/latest`)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const json = await response.json()
        if (mounted) {
          setState({ items: json.data || [], loading: false, error: null })
        }
      } catch (err) {
        if (mounted) {
          setState((prev) => ({ ...prev, loading: false, error: String(err) }))
        }
      }
    }

    fetchLatest()
    intervalId = setInterval(fetchLatest, 60000) // Refresh every 60 seconds

    return () => {
      mounted = false
      if (intervalId) clearInterval(intervalId)
    }
  }, [apiBaseUrl])

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" />
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="flex items-center justify-center h-full p-4 text-center">
        <div className="text-red-600 dark:text-red-400">
          <p className="font-semibold">Error loading recent media</p>
          <p className="text-sm mt-1">{state.error}</p>
        </div>
      </div>
    )
  }

  if (state.items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p>No recent media found</p>
      </div>
    )
  }

  return (
    <div className="p-4 overflow-y-auto h-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {state.items.map((item) => (
          <div
            key={item.uid}
            className="group relative rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            {/* Poster */}
            <div className="aspect-[2/3] bg-gray-300 dark:bg-gray-700">
              {item.posterUrl ? (
                <img
                  src={item.posterUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="text-4xl">
                    {item.type === 'movie' && '🎬'}
                    {item.type === 'tv' && '📺'}
                    {item.type === 'music' && '🎵'}
                    {item.type === 'video' && '🎥'}
                  </span>
                </div>
              )}
            </div>

            {/* Info Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <h3 className="font-semibold text-sm text-white truncate">{item.title}</h3>
                {item.secondaryTitle && (
                  <p className="text-xs text-gray-300 truncate">{item.secondaryTitle}</p>
                )}
                {item.year && <p className="text-xs text-gray-400 mt-1">{item.year}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
