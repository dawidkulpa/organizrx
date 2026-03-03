import { useState, useEffect } from 'react'
import type { SonarrCalendarEpisode, SonarrQueueRecord } from './types'
import { CalendarEpisodeCard } from './calendar-episode'
import { QueueRecordCard } from './queue-record'

interface WidgetProps {
  pluginId: string
  widgetId: string
}

interface CalendarWidgetProps extends WidgetProps {
  widgetId: 'sonarr-calendar'
}

interface QueueWidgetProps extends WidgetProps {
  widgetId: 'sonarr-queue'
}

interface APIResponse<T> {
  data: T
}

interface APIError {
  error: {
    code: string
    message: string
  }
}

function CalendarWidget({ pluginId }: CalendarWidgetProps) {
  const [episodes, setEpisodes] = useState<SonarrCalendarEpisode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCalendar() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/plugins/${pluginId}/calendar`)
        const json = (await response.json()) as APIResponse<SonarrCalendarEpisode[]> | APIError

        if (!response.ok) {
          const errorData = json as APIError
          throw new Error(errorData.error.message || 'Failed to fetch calendar')
        }

        const data = (json as APIResponse<SonarrCalendarEpisode[]>).data
        setEpisodes(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchCalendar()
    const interval = setInterval(fetchCalendar, 5 * 60 * 1000) // Refresh every 5 minutes

    return () => clearInterval(interval)
  }, [pluginId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">Loading calendar...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 dark:text-red-400">Error: {error}</div>
      </div>
    )
  }

  if (episodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">No upcoming episodes</div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4 bg-white dark:bg-gray-800">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        Upcoming Episodes
      </h2>
      <div className="space-y-3">
        {episodes.map((episode) => (
          <CalendarEpisodeCard key={episode.id} episode={episode} />
        ))}
      </div>
    </div>
  )
}

function QueueWidget({ pluginId }: QueueWidgetProps) {
  const [queueItems, setQueueItems] = useState<SonarrQueueRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchQueue() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/plugins/${pluginId}/queue`)
        const json = (await response.json()) as
          | APIResponse<{ records: SonarrQueueRecord[] }>
          | APIError

        if (!response.ok) {
          const errorData = json as APIError
          throw new Error(errorData.error.message || 'Failed to fetch queue')
        }

        const data = (json as APIResponse<{ records: SonarrQueueRecord[] }>).data
        setQueueItems(data.records)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchQueue()
    const interval = setInterval(fetchQueue, 30 * 1000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [pluginId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">Loading queue...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 dark:text-red-400">Error: {error}</div>
      </div>
    )
  }

  if (queueItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">Queue is empty</div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4 bg-white dark:bg-gray-800">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Download Queue</h2>
      <div className="space-y-3">
        {queueItems.map((item) => (
          <QueueRecordCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

export function SonarrWidget(props: WidgetProps) {
  if (props.widgetId === 'sonarr-calendar') {
    return <CalendarWidget {...(props as CalendarWidgetProps)} />
  }

  if (props.widgetId === 'sonarr-queue') {
    return <QueueWidget {...(props as QueueWidgetProps)} />
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-red-500">Unknown widget: {props.widgetId}</div>
    </div>
  )
}
