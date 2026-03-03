import { useEffect, useState } from 'react'
import type { EmbySession, EmbyItem } from './types'
import { SessionCard } from './session-card'
import { RecentCard } from './recent-card'

interface WidgetProps {
  pluginId: string
  widgetId: string
  config?: Record<string, unknown>
}

export function EmbySessionsWidget({ pluginId }: WidgetProps) {
  const [sessions, setSessions] = useState<EmbySession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSessions() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/plugins/${pluginId}/sessions`)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const json = await response.json()
        setSessions(json.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sessions')
      } finally {
        setLoading(false)
      }
    }

    fetchSessions()
    const interval = setInterval(fetchSessions, 10000) // Poll every 10s
    return () => clearInterval(interval)
  }, [pluginId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading sessions...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-600 dark:text-red-400">
          <svg
            className="inline-block h-12 w-12 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm font-medium">Error loading sessions</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <svg
            className="inline-block h-12 w-12 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm font-medium">No active sessions</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4 space-y-3">
      {sessions.map((session) => (
        <SessionCard key={session.Id} session={session} />
      ))}
    </div>
  )
}

export function EmbyRecentWidget({ pluginId }: WidgetProps) {
  const [items, setItems] = useState<EmbyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRecent() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/plugins/${pluginId}/latest?limit=10`)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const json = await response.json()
        setItems(json.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load recent items')
      } finally {
        setLoading(false)
      }
    }

    fetchRecent()
    const interval = setInterval(fetchRecent, 60000) // Poll every 60s
    return () => clearInterval(interval)
  }, [pluginId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading recent items...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-600 dark:text-red-400">
          <svg
            className="inline-block h-12 w-12 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm font-medium">Error loading recent items</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <svg
            className="inline-block h-12 w-12 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
            />
          </svg>
          <p className="text-sm font-medium">No recent items</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {items.map((item) => (
          <RecentCard key={item.Id} item={item} />
        ))}
      </div>
    </div>
  )
}
