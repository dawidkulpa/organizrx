import type { OverseerrRequest } from './widget'

// Get display name for requester
export function getRequesterName(request: OverseerrRequest): string {
  return (
    request.requestedBy.displayName ||
    request.requestedBy.username ||
    request.requestedBy.plexUsername ||
    'Unknown'
  )
}

// Get poster image URL
export function getPosterUrl(request: OverseerrRequest): string {
  if (request.media.posterPath) {
    return `https://image.tmdb.org/t/p/w300${request.media.posterPath}`
  }
  return '/placeholder-poster.png'
}

// Get status badge text
export function getStatusText(request: OverseerrRequest): string {
  if (request.media.status === 5) return 'Available'
  if (request.status === 2) return 'Approved'
  if (request.status === 3) return 'Denied'
  if (request.status === 1) return 'Pending'
  return 'Unknown'
}

// Get status badge color
export function getStatusColor(request: OverseerrRequest): string {
  if (request.media.status === 5) return 'bg-green-600 text-white'
  if (request.status === 2) return 'bg-blue-600 text-white'
  if (request.status === 3) return 'bg-red-600 text-white'
  if (request.status === 1) return 'bg-yellow-600 text-white'
  return 'bg-gray-600 text-white'
}

// Format date
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
