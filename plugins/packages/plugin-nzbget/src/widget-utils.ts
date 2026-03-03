// Utility Functions for NZBGet Widget

export function formatBytes(mb: number): string {
  if (mb === 0) return '0 MB'
  if (mb < 1) return `${(mb * 1024).toFixed(2)} KB`
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
  return `${mb.toFixed(2)} MB`
}

export function formatSpeed(bytesPerSec: number): string {
  const mbps = bytesPerSec / (1024 * 1024)
  if (mbps >= 1) {
    return `${mbps.toFixed(2)} MB/s`
  }
  const kbps = bytesPerSec / 1024
  return `${kbps.toFixed(2)} KB/s`
}

export function formatTime(seconds: number): string {
  if (seconds <= 0) return 'Unknown'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'DOWNLOADING':
      return 'text-blue-600 dark:text-blue-400'
    case 'PAUSED':
      return 'text-yellow-600 dark:text-yellow-400'
    case 'SUCCESS':
    case 'SUCCESS/PAR':
    case 'SUCCESS/UNPACK':
      return 'text-green-600 dark:text-green-400'
    case 'FAILURE':
    case 'FAILURE/PAR':
    case 'FAILURE/UNPACK':
    case 'WARNING':
      return 'text-red-600 dark:text-red-400'
    default:
      return 'text-gray-600 dark:text-gray-400'
  }
}
