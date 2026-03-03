// Formatting utilities for Sonarr widgets

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Tomorrow'
  } else if (diffDays === -1) {
    return 'Yesterday'
  } else if (diffDays > 1 && diffDays <= 7) {
    return `In ${diffDays} days`
  } else if (diffDays < -1 && diffDays >= -7) {
    return `${Math.abs(diffDays)} days ago`
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

export function formatEpisode(seasonNumber: number, episodeNumber: number): string {
  return `S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function formatTimeLeft(timeLeft?: string): string {
  if (!timeLeft) return 'Unknown'

  const match = timeLeft.match(/(\d+):(\d+):(\d+)/)
  if (!match) return timeLeft

  const [, hours, minutes] = match
  const h = parseInt(hours, 10)
  const m = parseInt(minutes, 10)

  if (h > 0) {
    return `${h}h ${m}m`
  }
  return `${m}m`
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'downloading':
      return 'text-blue-500 dark:text-blue-400'
    case 'paused':
      return 'text-yellow-500 dark:text-yellow-400'
    case 'queued':
      return 'text-gray-500 dark:text-gray-400'
    case 'completed':
      return 'text-green-500 dark:text-green-400'
    case 'failed':
    case 'warning':
      return 'text-red-500 dark:text-red-400'
    default:
      return 'text-gray-600 dark:text-gray-300'
  }
}
