import { getSetting, setSetting } from './settings'

// Constants
const APP_VERSION = '0.0.1'
const GITHUB_API_URL = 'https://api.github.com/repos/dawidkulpa/organizrx/releases/latest'
const DEFAULT_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours

// Types
export interface UpdateCheckResult {
  currentVersion: string
  latestVersion: string
  updateAvailable: boolean
  releaseUrl: string
  releaseNotes: string
  checkedAt: string
}

interface GitHubRelease {
  tag_name: string
  html_url: string
  body: string
}

// In-memory cache
let cachedResult: UpdateCheckResult | null = null
let cachedAt: number = 0

// ---------------------------------------------------------------------------
// Semver comparison
// ---------------------------------------------------------------------------

interface SemVer {
  major: number
  minor: number
  patch: number
}

export function parseSemVer(version: string): SemVer | null {
  const cleaned = version.startsWith('v') ? version.slice(1) : version
  const parts = cleaned.split('.')
  if (parts.length !== 3) return null

  const major = Number(parts[0])
  const minor = Number(parts[1])
  const patch = Number(parts[2])

  if (Number.isNaN(major) || Number.isNaN(minor) || Number.isNaN(patch)) return null
  return { major, minor, patch }
}

/**
 * Returns true if `latest` is newer than `current`.
 */
export function isNewerVersion(current: string, latest: string): boolean {
  const cur = parseSemVer(current)
  const lat = parseSemVer(latest)
  if (!cur || !lat) return false

  if (lat.major !== cur.major) return lat.major > cur.major
  if (lat.minor !== cur.minor) return lat.minor > cur.minor
  return lat.patch > cur.patch
}

// ---------------------------------------------------------------------------
// GitHub API fetch
// ---------------------------------------------------------------------------

async function fetchLatestRelease(): Promise<GitHubRelease | null> {
  const res = await fetch(GITHUB_API_URL, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': `OrganizrX/${APP_VERSION}`,
    },
    signal: AbortSignal.timeout(10_000),
  })

  if (res.status === 404) {
    // No releases published yet — valid state
    return null
  }

  if (res.status === 403 || res.status === 429) {
    throw new Error('GitHub API rate limit exceeded. Try again later.')
  }

  if (!res.ok) {
    throw new Error(`GitHub API returned status ${res.status}`)
  }

  const data = (await res.json()) as Record<string, unknown>

  if (typeof data.tag_name !== 'string' || typeof data.html_url !== 'string') {
    throw new Error('Invalid response from GitHub API')
  }

  return {
    tag_name: data.tag_name,
    html_url: data.html_url,
    body: typeof data.body === 'string' ? data.body : '',
  }
}

// ---------------------------------------------------------------------------
// Check interval
// ---------------------------------------------------------------------------

async function getCheckIntervalMs(): Promise<number> {
  const raw = await getSetting('UPDATE_CHECK_INTERVAL')
  if (!raw) return DEFAULT_CHECK_INTERVAL_MS
  const parsed = Number(raw)
  return Number.isNaN(parsed) || parsed <= 0 ? DEFAULT_CHECK_INTERVAL_MS : parsed
}

function isCacheValid(intervalMs: number): boolean {
  if (!cachedResult) return false
  return Date.now() - cachedAt < intervalMs
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function checkForUpdate(force = false): Promise<UpdateCheckResult> {
  const intervalMs = await getCheckIntervalMs()

  // Return cached result if within interval and not forced
  if (!force && isCacheValid(intervalMs) && cachedResult) {
    return cachedResult
  }

  // Try to load from settings if memory cache is empty
  if (!force && !cachedResult) {
    const stored = await getSetting('UPDATE_LAST_CHECK')
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as UpdateCheckResult & { _cachedAt?: number }
        const storedAt = parsed._cachedAt ?? 0
        if (Date.now() - storedAt < intervalMs) {
          cachedResult = {
            currentVersion: parsed.currentVersion,
            latestVersion: parsed.latestVersion,
            updateAvailable: parsed.updateAvailable,
            releaseUrl: parsed.releaseUrl,
            releaseNotes: parsed.releaseNotes,
            checkedAt: parsed.checkedAt,
          }
          cachedAt = storedAt
          return cachedResult
        }
      } catch {
        // Corrupt stored data — proceed with fresh check
      }
    }
  }

  try {
    const release = await fetchLatestRelease()

    // No releases published yet — report as up-to-date
    if (!release) {
      const result: UpdateCheckResult = {
        currentVersion: APP_VERSION,
        latestVersion: APP_VERSION,
        updateAvailable: false,
        releaseUrl: '',
        releaseNotes: '',
        checkedAt: new Date().toISOString(),
      }
      cachedResult = result
      cachedAt = Date.now()
      return result
    }

    const latestVersion = release.tag_name.startsWith('v')
      ? release.tag_name.slice(1)
      : release.tag_name

    const result: UpdateCheckResult = {
      currentVersion: APP_VERSION,
      latestVersion,
      updateAvailable: isNewerVersion(APP_VERSION, latestVersion),
      releaseUrl: release.html_url,
      releaseNotes: release.body,
      checkedAt: new Date().toISOString(),
    }

    // Update cache
    cachedResult = result
    cachedAt = Date.now()

    // Persist to settings
    await setSetting('UPDATE_LAST_CHECK', JSON.stringify({ ...result, _cachedAt: cachedAt }))

    return result
  } catch (error) {
    // If we have a stale cached result, return it on error
    if (cachedResult) {
      return cachedResult
    }

    const message = error instanceof Error ? error.message : 'Unknown error checking for updates'
    throw new Error(message)
  }
}

export async function getChangelog(): Promise<{ releaseNotes: string; version: string }> {
  const release = await fetchLatestRelease()
  if (!release) {
    return { releaseNotes: '', version: APP_VERSION }
  }
  const version = release.tag_name.startsWith('v') ? release.tag_name.slice(1) : release.tag_name
  return {
    releaseNotes: release.body,
    version,
  }
}

// ---------------------------------------------------------------------------
// Testing helpers
// ---------------------------------------------------------------------------

export function _resetUpdateCache(): void {
  cachedResult = null
  cachedAt = 0
}
