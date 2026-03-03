import type { RadarrCalendarItem } from './types'

interface CalendarItemProps {
  movie: RadarrCalendarItem
}

export function CalendarItemCard({ movie }: CalendarItemProps) {
  const releaseDate = movie.physicalRelease || movie.digitalRelease || movie.inCinemas
  const hasFile = movie.hasFile
  const statusColor = hasFile
    ? 'text-green-600 dark:text-green-400'
    : 'text-yellow-600 dark:text-yellow-400'

  return (
    <div
      key={movie.id}
      className="flex gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
    >
      <div className="flex-shrink-0 w-16 h-24 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
        {movie.images.find((img) => img.coverType === 'poster') ? (
          <img
            src={
              movie.images.find((img) => img.coverType === 'poster')!.remoteUrl ||
              movie.images.find((img) => img.coverType === 'poster')!.url
            }
            alt={movie.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              />
            </svg>
          </div>
        )}
      </div>
      <div className="flex-grow min-w-0">
        <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
          {movie.title} {movie.year && `(${movie.year})`}
        </h4>
        <div className="flex items-center gap-2 mt-1 text-xs">
          <span className={statusColor}>{hasFile ? '✓ Downloaded' : '⏳ Pending'}</span>
          {releaseDate && (
            <span className="text-gray-500 dark:text-gray-400">
              {new Date(releaseDate).toLocaleDateString()}
            </span>
          )}
        </div>
        {movie.movieFile?.quality && (
          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            {movie.movieFile.quality.quality.name}
          </div>
        )}
        {movie.overview && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
            {movie.overview}
          </p>
        )}
      </div>
    </div>
  )
}
