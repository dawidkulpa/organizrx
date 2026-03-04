import { listUsers } from './users'

// Cache the setup status so we don't query DB on every request
let isSetupComplete: boolean | null = null

export async function checkSetupComplete(): Promise<boolean> {
  if (isSetupComplete === true) return true // Once set up, never recheck
  try {
    const { total } = await listUsers(1, 1)
    isSetupComplete = total > 0
    return isSetupComplete
  } catch {
    // DB not ready — treat as not set up
    return false
  }
}

// Reset cache when wizard completes (call from wizard route)
export function resetSetupCache(): void {
  isSetupComplete = null
}
