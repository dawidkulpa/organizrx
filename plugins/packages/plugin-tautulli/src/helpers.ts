import type { TautulliSession, TautulliHistoryItem } from './types'

export function getMediaTitle(item: TautulliSession | TautulliHistoryItem): string {
  if (item.media_type === 'episode') {
    return `${item.grandparent_title || item.title} - S${String(item.parent_media_index || 0).padStart(2, '0')}E${String(item.media_index || 0).padStart(2, '0')} - ${item.title}`
  }
  if (item.media_type === 'track') {
    return `${item.grandparent_title || item.title} - ${item.title}`
  }
  return item.title
}

export function getTranscodeIcon(decision: string): string {
  if (decision === 'transcode') {
    return '⚡'
  }
  if (decision === 'copy') {
    return '📋'
  }
  return '▶️'
}

export function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) {
    return 'just now'
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }
  if (diffDays === 1) {
    return 'yesterday'
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`
  }
  return date.toLocaleDateString()
}
