import { useState, useEffect } from 'react'
import { TorrentItem } from './torrent-item'
import { LoadingState, ErrorState, EmptyState } from './state-components'
import { formatSpeed } from './utils'

interface QBittorrentTorrent {
  hash: string
  name: string
  size: number
  progress: number
  dlspeed: number
  upspeed: number
  eta: number
  state: string
  downloaded: number
  uploaded: number
  ratio: number
  category: string
  tags: string
  added_on: number
  completion_on: number
  tracker: string
  num_seeds: number
  num_leechs: number
  priority: number
}

interface WidgetProps {
  pluginId: string
  widgetId: string
  settings?: Record<string, unknown>
}

class ApiClient {
  constructor(private pluginId: string) {}

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`/api/plugins/${this.pluginId}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => ({
        error: { message: response.statusText },
      }))) as { error?: { message: string } }
      throw new Error(error.error?.message || 'Request failed')
    }

    const result = (await response.json()) as { data: T }
    return result.data
  }

  async getTorrents(): Promise<QBittorrentTorrent[]> {
    return this.request<QBittorrentTorrent[]>('/torrents')
  }

  async pauseTorrent(hash: string): Promise<void> {
    await this.request(`/torrents/${hash}/pause`, { method: 'POST' })
  }

  async resumeTorrent(hash: string): Promise<void> {
    await this.request(`/torrents/${hash}/resume`, { method: 'POST' })
  }
}



function TorrentItem({
  torrent,
  onPause,
  onResume,
}: {
  torrent: QBittorrentTorrent
  onPause: (hash: string) => void
  onResume: (hash: string) => void
}) {
  const percentage = (torrent.progress * 100).toFixed(1)
  const isPaused = torrent.state.includes('paused')
  const stateInfo = getStateDisplay(torrent.state)

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-2 bg-white dark:bg-gray-800">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {torrent.name}
          </h4>
          <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400 mt-1">
            <span>Size: {formatBytes(torrent.size)}</span>
            <span className={stateInfo.color}>{stateInfo.label}</span>
            {torrent.category && <span>Category: {torrent.category}</span>}
          </div>
        </div>
        <button
          onClick={() => (isPaused ? onResume(torrent.hash) : onPause(torrent.hash))}
          className={`ml-2 px-3 py-1 text-xs rounded transition-colors ${
            isPaused
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-yellow-500 hover:bg-yellow-600 text-white'
          }`}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
      </div>
      <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-blue-500 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
        <span>{percentage}%</span>
        <span>
          ↓ {formatSpeed(torrent.dlspeed)} ↑ {formatSpeed(torrent.upspeed)}
        </span>
      </div>
      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
        <span>ETA: {formatETA(torrent.eta)}</span>
        <span>
          Seeds: {torrent.num_seeds} Peers: {torrent.num_leechs}
        </span>
      </div>
    </div>
  )
}



export default function QBittorrentWidget({ pluginId }: WidgetProps) {
  const [torrents, setTorrents] = useState<QBittorrentTorrent[]>([])
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

        const data = await client.getTorrents()
        if (mounted) setTorrents(data)
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
  }, [refreshKey])

  async function handlePauseTorrent(hash: string) {
    try {
      await client.pauseTorrent(hash)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause torrent')
    }
  }

  async function handleResumeTorrent(hash: string) {
    try {
      await client.resumeTorrent(hash)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume torrent')
    }
  }

  function handleRetry() {
    setRefreshKey((k) => k + 1)
  }

  // Calculate totals
  const totalDownloadSpeed = torrents.reduce((sum, t) => sum + t.dlspeed, 0)
  const totalUploadSpeed = torrents.reduce((sum, t) => sum + t.upspeed, 0)
  const activeTorrents = torrents.filter((t) => !t.state.includes('paused')).length

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">qBittorrent</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {activeTorrents} active • ↓ {formatSpeed(totalDownloadSpeed)} • ↑{' '}
            {formatSpeed(totalUploadSpeed)}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} onRetry={handleRetry} />}
        {!loading && !error && (
          <>
            {torrents.length > 0 ? (
              torrents.map((torrent) => (
                <TorrentItem
                  key={torrent.hash}
                  torrent={torrent}
                  onPause={handlePauseTorrent}
                  onResume={handleResumeTorrent}
                />
              ))
            ) : (
              <EmptyState message="No torrents" />
            )}
          </>
        )}
      </div>
    </div>
  )
}
