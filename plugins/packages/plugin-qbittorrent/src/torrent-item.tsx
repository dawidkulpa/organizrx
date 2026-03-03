import { formatBytes, formatSpeed, formatETA, getStateDisplay } from './utils'

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

interface TorrentItemProps {
  torrent: QBittorrentTorrent
  onPause: (hash: string) => void
  onResume: (hash: string) => void
}

export function TorrentItem({ torrent, onPause, onResume }: TorrentItemProps) {
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
