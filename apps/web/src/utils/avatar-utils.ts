/**
 * Extract 2-letter initials from a display name (e.g. "John Doe" -> "JD")
 * Falls back to first 2 characters if only one word, or defaults to 'U'
 */
export function getInitials(displayName: string): string {
  if (!displayName?.trim()) return 'U'

  const words = displayName.trim().split(/\s+/).filter(Boolean)

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase()
  }

  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase()
  }

  return 'U'
}

/**
 * Generate a deterministic color from a username using a simple hash function
 * Returns one of 10 distinct colors
 */
export function getAvatarColor(username: string): string {
  if (!username) return '#6366f1' // default indigo

  // Simple hash: sum ASCII values of each character
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = (hash << 5) - hash + username.charCodeAt(i)
    hash = hash & hash // Keep it 32-bit
  }

  const colorPalette = [
    '#6366f1', // indigo-500
    '#3b82f6', // blue-500
    '#0ea5e9', // cyan-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#ec4899', // pink-500
    '#8b5cf6', // violet-500
    '#06b6d4', // cyan-500
    '#14b8a6', // teal-500
  ]

  const index = Math.abs(hash) % colorPalette.length
  return colorPalette[index]
}
