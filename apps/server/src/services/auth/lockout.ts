import { getConfig } from '../../config'

import type { AuthUser } from '@organizrx/shared'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LockoutEntry {
  attempts: number
  lockedUntil: number | null
}

const lockoutMap = new Map<string, LockoutEntry>()

// ---------------------------------------------------------------------------
// Lockout logic — in-memory, server-side (not bypassable via cookies)
// ---------------------------------------------------------------------------

export function checkLockout(username: string): { locked: boolean; remainingMs: number } {
  const key = username.toLowerCase()
  const entry = lockoutMap.get(key)

  if (!entry || !entry.lockedUntil) {
    return { locked: false, remainingMs: 0 }
  }

  const now = Date.now()
  if (now >= entry.lockedUntil) {
    lockoutMap.delete(key)
    return { locked: false, remainingMs: 0 }
  }

  return { locked: true, remainingMs: entry.lockedUntil - now }
}

export function recordFailedAttempt(username: string): void {
  const { auth } = getConfig()
  const key = username.toLowerCase()
  const entry = lockoutMap.get(key) ?? { attempts: 0, lockedUntil: null }

  entry.attempts += 1

  if (entry.attempts >= auth.loginAttempts) {
    entry.lockedUntil = Date.now() + auth.loginLockoutMs
  }

  lockoutMap.set(key, entry)
}

export function clearFailedAttempts(username: string): void {
  lockoutMap.delete(username.toLowerCase())
}

export function toAuthUser(row: {
  id: number
  username: string | null
  email: string | null
  groupName: string | null
  group_id: number | null
  image: string | null
}): AuthUser {
  return {
    id: row.id,
    username: row.username ?? '',
    email: row.email,
    groupName: row.groupName,
    group_id: row.group_id,
    image: row.image,
  }
}

// ---------------------------------------------------------------------------
// Testing helpers
// ---------------------------------------------------------------------------

export function _resetLockoutMap(): void {
  lockoutMap.clear()
}
