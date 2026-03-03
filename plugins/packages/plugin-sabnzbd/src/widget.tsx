import { useState, useEffect } from 'react'
import type { SabnzbdQueueData, SabnzbdHistoryData, TabType, WidgetProps } from './types'
import { ApiClient } from './api-client'
import { formatSpeed } from './utils'
import { LoadingState, ErrorState, EmptyState } from './state-components'
import { QueueItem } from './queue-item'
import { HistoryItem } from './history-item'

export default function SabnzbdWidget({ pluginId }: WidgetProps) {
  const [activeTab, setActiveTab] = useState<TabType>('queue')
  const [queueData, setQueueData] = useState<SabnzbdQueueData | null>(null)
  const [historyData, setHistoryData] = useState<SabnzbdHistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const client = new ApiClient(pluginId)

  useEffect(() => {
    let mounted = true

    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        if (activeTab === 'queue') {
          const data = await client.getQueue()
          if (mounted) setQueueData(data)
        } else {
          const data = await client.getHistory()
          if (mounted) setHistoryData(data)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch data')
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchData()

    const interval = setInterval(fetchData, 5000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [activeTab, refreshKey])

  async function handlePause() {
    try {
      await client.pause()
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause queue')
    }
  }

  async function handleResume() {
    try {
      await client.resume()
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume queue')
    }
  }

  async function handlePauseItem(id: string) {
    try {
      await client.pauseItem(id)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause item')
    }
  }

  async function handleResumeItem(id: string) {
    try {
      await client.resumeItem(id)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume item')
    }
  }

  function handleRetry() {
    setRefreshKey((k) => k + 1)
  }

  const queue = queueData?.queue
  const history = historyData?.history

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">SABnzbd</h3>
          {queue && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {formatSpeed(queue.kbpersec)} • {queue.noofslots} active • {queue.sizeleft} remaining
            </p>
          )}
        </div>
        {queue && (
          <button
            onClick={queue.paused ? handleResume : handlePause}
            className={`px-4 py-2 text-sm rounded transition-colors ${
              queue.paused
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-yellow-500 hover:bg-yellow-600 text-white'
            }`}
          >
            {queue.paused ? 'Resume All' : 'Pause All'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'queue'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Queue {queue && `(${queue.noofslots})`}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          History {history && `(${history.slots.length})`}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} onRetry={handleRetry} />}
        {!loading && !error && activeTab === 'queue' && (
          <>
            {queue && queue.slots.length > 0 ? (
              queue.slots.map((slot) => (
                <QueueItem
                  key={slot.nzo_id}
                  slot={slot}
                  onPause={handlePauseItem}
                  onResume={handleResumeItem}
                />
              ))
            ) : (
              <EmptyState message="No active downloads" />
            )}
          </>
        )}
        {!loading && !error && activeTab === 'history' && (
          <>
            {history && history.slots.length > 0 ? (
              history.slots.map((slot) => <HistoryItem key={slot.nzo_id} slot={slot} />)
            ) : (
              <EmptyState message="No download history" />
            )}
          </>
        )}
      </div>
    </div>
  )
}
