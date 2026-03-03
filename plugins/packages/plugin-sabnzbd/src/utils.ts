export function formatBytes(bytes: string | number): string {
  const num = typeof bytes === 'string' ? parseFloat(bytes) : bytes
  if (num === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(num) / Math.log(k))
  return `${(num / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

export function formatSpeed(speedMB: string): string {
  const speed = parseFloat(speedMB)
  if (speed >= 1) {
    return `${speed.toFixed(2)} MB/s`
  }
  return `${(speed * 1024).toFixed(2)} KB/s`
}

export function formatTime(timeStr: string): string {
  if (!timeStr || timeStr === '0:00:00') return 'Unknown'
  return timeStr
}
