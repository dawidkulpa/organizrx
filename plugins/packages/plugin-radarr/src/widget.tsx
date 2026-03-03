import { useState, useEffect } from 'react'
import type { RadarrCalendarItem, RadarrQueueItem, RadarrQueueResponse } from './types'
import { CalendarItemCard } from './calendar-item'
import { QueueItemCard } from './queue-item'

interface WidgetProps {
  pluginId: string
  widgetId: string
  config?: Record<string, unknown>
}

interface CalendarWidgetProps extends WidgetProps {
  widgetId: 'radarr-calendar'
}

interface QueueWidgetProps extends WidgetProps {
  widgetId: 'radarr-queue'
}

/**
 * Radarr Calendar Widget — Shows upcoming movie releases
 */
export function RadarrCalendarWidget({ pluginId }: CalendarWidgetProps) {
  const [calendar, setCalendar] = useState<RadarrCalendarItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchCalendar() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/plugins/${pluginId}/calendar`)
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: { message: 'Unknown error' } }))
          throw new Error(errorData.error?.message || `HTTP ${response.status}`)
        }

        const json = await response.json()
        if (mounted) {
          setCalendar(json.data || [])
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch calendar')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchCalendar()
    const interval = setInterval(fetchCalendar, 5 * 60 * 1000) // Refresh every 5 minutes

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [pluginId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading calendar...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <div className="text-red-500 mb-2">
            <svg className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  if (calendar.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <svg
            className="h-8 w-8 mx-auto mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm">No upcoming movies</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4">
      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
        Upcoming Movies
      </h3>
      <div className="space-y-3">
        {calendar.slice(0, 10).map((movie) => (
          <CalendarItemCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  )
}

/**
 * Radarr Queue Widget — Shows active downloads with progress
 */
export function RadarrQueueWidget({ pluginId }: QueueWidgetProps) {
  const [queue, setQueue] = useState<RadarrQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchQueue() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/plugins/${pluginId}/queue`)
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: { message: 'Unknown error' } }))
          throw new Error(errorData.error?.message || `HTTP ${response.status}`)
        }

        const json: { data: RadarrQueueResponse } = await response.json()
        if (mounted) {
          setQueue(json.data.records || [])
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch queue')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchQueue()
    const interval = setInterval(fetchQueue, 30 * 1000) // Refresh every 30 seconds

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [pluginId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading queue...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <div className="text-red-500 mb-2">
            <svg className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  if (queue.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <svg
            className="h-8 w-8 mx-auto mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-sm">No active downloads</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4">
      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
        Download Queue
      </h3>
      <div className="space-y-3">
        {queue.map((item) => (
          <QueueItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
