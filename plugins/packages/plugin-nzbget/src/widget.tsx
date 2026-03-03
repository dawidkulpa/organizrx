import { useState, useEffect } from 'react'
import type { WidgetProps, QueueData, HistoryData, TabType } from './widget-types'
import ApiClient from './api-client'
import { QueueItem } from './queue-item'
import { HistoryItem } from './history-item'
import { LoadingState, ErrorState, EmptyState } from './state-components'
import { formatBytes, formatSpeed } from './widget-utils'

export default function NzbGetWidget({ pluginId }: WidgetProps) {
  const [activeTab, setActiveTab] = useState<TabType>('queue')
  const [queueData, setQueueData] = useState<QueueData | null>(null)
  const [historyData, setHistoryData] = useState<HistoryData | null>(null)
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

  async function handlePause(nzbId: number) {
    try {
      await client.pause(nzbId)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause download')
    }
  }

  async function handleResume(nzbId: number) {
    try {
      await client.resume(nzbId)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume download')
    }
  }

  function handleRetry() {
    setRefreshKey((k) => k + 1)
  }

  const queue = queueData
  const history = historyData

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">NZBGet</h3>
          {queue && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {formatSpeed(queue.downloadRate)} • {queue.activeCount} active •{' '}
              {formatBytes(queue.remainingSizeMB)} remaining
            </p>
          )}
        </div>
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
          Queue {queue && `(${queue.groups.length})`}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          History {history && `(${history.items.length})`}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} onRetry={handleRetry} />}
        {!loading && !error && activeTab === 'queue' && (
          <>
            {queue && queue.groups.length > 0 ? (
              queue.groups.map((group) => (
                <QueueItem
                  key={group.NZBID}
                  group={group}
                  onPause={handlePause}
                  onResume={handleResume}
                />
              ))
            ) : (
              <EmptyState message="No active downloads" />
            )}
          </>
        )}
        {!loading && !error && activeTab === 'history' && (
          <>
            {history && history.items.length > 0 ? (
              history.items.map((item) => <HistoryItem key={item.NZBID} item={item} />)
            ) : (
              <EmptyState message="No download history" />
            )}
          </>
        )}
      </div>
    </div>
  )
}
