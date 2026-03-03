import type { SonarrCalendarEpisode } from './types'
import { formatDate, formatEpisode } from './utils'

interface CalendarEpisodeProps {
  episode: SonarrCalendarEpisode
}

export function CalendarEpisodeCard({ episode }: CalendarEpisodeProps) {
  const hasFile = episode.hasFile
  const isAired = new Date(episode.airDateUtc) < new Date()
  const statusColor = hasFile
    ? 'text-green-500 dark:text-green-400'
    : isAired
      ? 'text-red-500 dark:text-red-400'
      : 'text-blue-500 dark:text-blue-400'

  return (
    <div
      key={episode.id}
      className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {episode.series.title}
            </h3>
            <span className={`text-xs font-medium ${statusColor}`}>
              {hasFile ? '✓' : isAired ? '✗' : '○'}
            </span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
            {formatEpisode(episode.seasonNumber, episode.episodeNumber)} - {episode.title}
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span>{formatDate(episode.airDateUtc)}</span>
            {episode.episodeFile?.quality?.quality?.name && (
              <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
                {episode.episodeFile.quality.quality.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
