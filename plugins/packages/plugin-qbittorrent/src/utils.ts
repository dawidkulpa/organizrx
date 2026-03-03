// Formatting utilities for qBittorrent widget

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec === 0) return '0 B/s'
  const k = 1024
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const i = Math.floor(Math.log(bytesPerSec) / Math.log(k))
  return `${(bytesPerSec / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

export function formatETA(seconds: number): string {
  if (seconds === 8640000 || seconds <= 0) return 'Unknown'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

export function getStateDisplay(state: string): { label: string; color: string } {
  const stateMap: Record<string, { label: string; color: string }> = {
    downloading: { label: 'Downloading', color: 'text-blue-600 dark:text-blue-400' },
    uploading: { label: 'Seeding', color: 'text-green-600 dark:text-green-400' },
    pausedDL: { label: 'Paused', color: 'text-yellow-600 dark:text-yellow-400' },
    pausedUP: { label: 'Paused', color: 'text-yellow-600 dark:text-yellow-400' },
    stalledDL: { label: 'Stalled', color: 'text-orange-600 dark:text-orange-400' },
    stalledUP: { label: 'Stalled', color: 'text-orange-600 dark:text-orange-400' },
    queuedDL: { label: 'Queued', color: 'text-gray-600 dark:text-gray-400' },
    queuedUP: { label: 'Queued', color: 'text-gray-600 dark:text-gray-400' },
    checkingDL: { label: 'Checking', color: 'text-purple-600 dark:text-purple-400' },
    checkingUP: { label: 'Checking', color: 'text-purple-600 dark:text-purple-400' },
    error: { label: 'Error', color: 'text-red-600 dark:text-red-400' },
    missingFiles: { label: 'Missing Files', color: 'text-red-600 dark:text-red-400' },
  }

  return stateMap[state] || { label: state, color: 'text-gray-600 dark:text-gray-400' }
}
