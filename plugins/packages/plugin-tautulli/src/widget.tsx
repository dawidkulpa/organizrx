import { useEffect, useState } from 'react'
import type {
  TautulliActivity,
  TautulliHistory,
  ActivityWidgetProps,
  HistoryWidgetProps,
} from './types'
import { formatBytes } from './format-utils'
import { ActivitySessionCard } from './activity-session-card'
import { HistoryItem } from './history-item'

export function TautulliActivityWidget({ pluginId }: ActivityWidgetProps) {
  const [activity, setActivity] = useState<TautulliActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchActivity() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/plugins/${pluginId}/activity`)
        if (!response.ok) {
          throw new Error(`Failed to fetch activity: ${response.statusText}`)
        }
        const json = await response.json()
        if (json.error) {
          throw new Error(json.error.message || 'Unknown error')
        }
        setActivity(json.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load activity')
      } finally {
        setLoading(false)
      }
    }

    fetchActivity()
    const interval = setInterval(fetchActivity, 30000)
    return () => clearInterval(interval)
  }, [pluginId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white rounded-lg p-4">
        <div className="animate-pulse">Loading activity...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-red-400 rounded-lg p-4">
        <div className="text-center">
          <div className="text-xl mb-2">⚠️</div>
          <div>{error}</div>
        </div>
      </div>
    )
  }

  if (!activity || activity.sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400 rounded-lg p-4">
        <div className="text-center">
          <div className="text-3xl mb-2">💤</div>
          <div>No active streams</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-900 text-white rounded-lg p-4 overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Current Activity</h3>
        <div className="flex gap-2 text-sm">
          <span className="px-2 py-1 bg-green-600 rounded">
            {activity.stream_count} {activity.stream_count === 1 ? 'stream' : 'streams'}
          </span>
          <span className="px-2 py-1 bg-blue-600 rounded">
            {formatBytes(activity.total_bandwidth)}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {activity.sessions.map((session) => (
          <ActivitySessionCard key={session.session_key} session={session} />
        ))}
      </div>
    </div>
  )
}

export function TautulliHistoryWidget({ pluginId }: HistoryWidgetProps) {
  const [history, setHistory] = useState<TautulliHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/plugins/${pluginId}/history?length=10`)
        if (!response.ok) {
          throw new Error(`Failed to fetch history: ${response.statusText}`)
        }
        const json = await response.json()
        if (json.error) {
          throw new Error(json.error.message || 'Unknown error')
        }
        setHistory(json.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history')
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
    const interval = setInterval(fetchHistory, 60000)
    return () => clearInterval(interval)
  }, [pluginId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white rounded-lg p-4">
        <div className="animate-pulse">Loading history...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-red-400 rounded-lg p-4">
        <div className="text-center">
          <div className="text-xl mb-2">⚠️</div>
          <div>{error}</div>
        </div>
      </div>
    )
  }

  if (!history || history.data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400 rounded-lg p-4">
        <div className="text-center">
          <div className="text-3xl mb-2">📭</div>
          <div>No recent history</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-900 text-white rounded-lg p-4 overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recently Watched</h3>
        <span className="text-sm text-gray-400">{history.recordsTotal} total</span>
      </div>

      <div className="space-y-2">
        {history.data.map((item) => (
          <HistoryItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
