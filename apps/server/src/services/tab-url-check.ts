import { validateUrl } from './connection-tester'

export interface TabUrlCheckResult {
  reachable: boolean
  iframeAllowed: boolean
  status: number
}

interface CachedTabUrlCheckResult {
  expiresAt: number
  result: TabUrlCheckResult
}

const CACHE_TTL_MS = 5 * 60 * 1000
const urlCheckCache = new Map<string, CachedTabUrlCheckResult>()

function getCachedResult(url: string): TabUrlCheckResult | null {
  const cached = urlCheckCache.get(url)
  if (!cached) {
    return null
  }

  if (cached.expiresAt <= Date.now()) {
    urlCheckCache.delete(url)
    return null
  }

  return cached.result
}

function setCachedResult(url: string, result: TabUrlCheckResult): void {
  urlCheckCache.set(url, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    result,
  })
}

function getFrameAncestorsDirective(cspHeader: string): string | null {
  const directives = cspHeader
    .split(';')
    .map((directive) => directive.trim())
    .filter(Boolean)

  const frameAncestorsDirective = directives.find((directive) =>
    directive.toLowerCase().startsWith('frame-ancestors')
  )

  return frameAncestorsDirective ?? null
}

function sourceAllowsOrigin(
  source: string,
  embedderOrigin: string,
  protectedOrigin: string
): boolean {
  const normalizedSource = source.trim().toLowerCase()
  const normalizedEmbedderOrigin = embedderOrigin.toLowerCase()
  const normalizedProtectedOrigin = protectedOrigin.toLowerCase()

  if (normalizedSource === "'none'") {
    return false
  }

  if (normalizedSource === '*') {
    return true
  }

  if (normalizedSource === "'self'") {
    return normalizedEmbedderOrigin === normalizedProtectedOrigin
  }

  if (normalizedSource.endsWith(':')) {
    const embedderProtocol = new URL(embedderOrigin).protocol.toLowerCase()
    return embedderProtocol === normalizedSource
  }

  if (normalizedSource.includes('://')) {
    const wildcardMatch = normalizedSource.match(/^(https?:)\/\/\*\.(.+)$/)
    if (wildcardMatch) {
      const [, scheme, wildcardHost] = wildcardMatch
      const embedderUrl = new URL(embedderOrigin)
      if (embedderUrl.protocol.toLowerCase() !== scheme.toLowerCase()) {
        return false
      }

      return (
        embedderUrl.hostname.toLowerCase() === wildcardHost.toLowerCase() ||
        embedderUrl.hostname.toLowerCase().endsWith(`.${wildcardHost.toLowerCase()}`)
      )
    }

    return normalizedEmbedderOrigin === normalizedSource
  }

  return false
}

export function isIframeAllowedByHeaders(
  headers: Headers,
  targetUrl: string,
  embedderOrigin: string | null
): boolean {
  const xFrameOptions = headers.get('x-frame-options')?.trim().toLowerCase()
  if (xFrameOptions) {
    if (xFrameOptions === 'deny' || xFrameOptions === 'sameorigin') {
      return false
    }

    if (xFrameOptions.startsWith('allow-from')) {
      const allowedOrigin = xFrameOptions.slice('allow-from'.length).trim()
      if (!embedderOrigin || !allowedOrigin) {
        return false
      }

      return allowedOrigin === embedderOrigin.toLowerCase()
    }
  }

  const csp = headers.get('content-security-policy')
  if (!csp) {
    return true
  }

  const frameAncestorsDirective = getFrameAncestorsDirective(csp)
  if (!frameAncestorsDirective) {
    return true
  }

  const parts = frameAncestorsDirective.split(/\s+/).filter(Boolean)
  const sources = parts.slice(1)

  if (sources.length === 0) {
    return false
  }

  if (!embedderOrigin) {
    return sources.includes('*')
  }

  const targetOrigin = new URL(targetUrl).origin
  return sources.some((source) => sourceAllowsOrigin(source, embedderOrigin, targetOrigin))
}

export async function checkTabUrl(
  url: string,
  embedderOrigin: string | null
): Promise<TabUrlCheckResult> {
  const cachedResult = getCachedResult(url)
  if (cachedResult) {
    return cachedResult
  }

  await validateUrl(url)

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
    })

    const result: TabUrlCheckResult = {
      reachable: true,
      iframeAllowed: isIframeAllowedByHeaders(response.headers, url, embedderOrigin),
      status: response.status,
    }

    setCachedResult(url, result)
    return result
  } catch {
    const result: TabUrlCheckResult = {
      reachable: false,
      iframeAllowed: false,
      status: 0,
    }

    setCachedResult(url, result)
    return result
  }
}

export function _resetTabUrlCheckCache(): void {
  urlCheckCache.clear()
}
