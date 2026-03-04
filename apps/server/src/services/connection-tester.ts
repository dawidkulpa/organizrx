import { promises as dns } from 'node:dns'
import { performance } from 'node:perf_hooks'
import type { testConnectionRequestSchema } from '@organizrx/shared'
import type { z } from 'zod'

type TestConnectionRequest = z.infer<typeof testConnectionRequestSchema>

interface TestResult {
  success: boolean
  latencyMs: number
  statusCode?: number
  error?: string
}

// Rate limiting: max 5 tests per minute per user
const rateLimitMap = new Map<number, number[]>()

// ---------------------------------------------------------------------------
// SSRF Protection
// ---------------------------------------------------------------------------

// Cloud metadata endpoints (AWS, Google Cloud, Azure, etc.)
const CLOUD_METADATA_IPS = [
  '169.254.169.254', // AWS EC2
  'fd00:ec2::254', // AWS EC2 IPv6
  '::ffff:169.254.169.254', // IPv4-mapped IPv6
  'metadata.google.internal',
  '169.254.169.254',
  '168.63.129.16', // Azure
]

// Localhost ranges
const LOCALHOST_RANGES = [
  '127.0.0.0/8', // 127.0.0.0 - 127.255.255.255
  '::1', // IPv6 loopback
  'localhost',
  '0.0.0.0',
  '::',
]

/**
 * Check if an IP address falls within a CIDR range
 */
function ipInRange(ip: string, cidrNotation: string): boolean {
  const [range, bits] = cidrNotation.split('/')
  if (!bits) return ip === range

  const rangeBits = bits ? parseInt(bits, 10) : 32
  const rangeIp = range.split('.').map(Number)
  const checkIp = ip.split('.').map(Number)

  if (rangeIp.length !== 4 || checkIp.length !== 4) return false

  const mask = (0xffffffff << (32 - rangeBits)) >>> 0
  const rangeNum = ((rangeIp[0] << 24) | (rangeIp[1] << 16) | (rangeIp[2] << 8) | rangeIp[3]) >>> 0
  const checkNum = ((checkIp[0] << 24) | (checkIp[1] << 16) | (checkIp[2] << 8) | checkIp[3]) >>> 0

  return (rangeNum & mask) === (checkNum & mask)
}

/**
 * Check if an IP is in private range (allowed for home-lab use)
 */
function isPrivateIP(ip: string): boolean {
  // Private ranges - ALLOWED for home-lab
  return (
    ipInRange(ip, '192.168.0.0/16') || // 192.168.0.0 - 192.168.255.255
    ipInRange(ip, '10.0.0.0/8') || // 10.0.0.0 - 10.255.255.255
    ipInRange(ip, '172.16.0.0/12') // 172.16.0.0 - 172.31.255.255
  )
}

/**
 * Check if an IP is blocked (cloud metadata or localhost)
 */
function isBlockedIP(ip: string): boolean {
  const normalizedIp = ip.toLowerCase()

  // Check cloud metadata
  if (CLOUD_METADATA_IPS.includes(normalizedIp)) {
    return true
  }

  // Check localhost ranges
  for (const localhost of LOCALHOST_RANGES) {
    if (localhost === normalizedIp) return true
    if (localhost.includes('/') && ipInRange(ip, localhost)) return true
  }

  // Check IPv6 loopback
  if (normalizedIp === '::1' || normalizedIp === '0:0:0:0:0:0:0:1') {
    return true
  }

  return false
}

/**
 * Resolve hostname to IP and validate against blocklist
 */
async function validateHostname(hostname: string): Promise<string> {
  try {
    const addresses = await dns.resolve4(hostname)
    if (!addresses.length) {
      throw new Error('Hostname resolution returned no addresses')
    }

    const ip = addresses[0]

    if (isBlockedIP(ip)) {
      throw new Error(`Hostname resolves to blocked IP: ${ip}`)
    }

    return ip
  } catch (error) {
    if (error instanceof Error && error.message.includes('blocked')) {
      throw error
    }
    throw new Error(`Failed to resolve hostname: ${hostname}`)
  }
}

/**
 * Validate URL for SSRF attacks
 */
async function validateUrl(url: string): Promise<void> {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error('Invalid URL format')
  }

  // Only allow http and https
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('Only http:// and https:// protocols are allowed')
  }

  // Check hostname is present
  if (!parsedUrl.hostname) {
    throw new Error('URL must have a hostname')
  }

  // Check if hostname is a direct IP address
  const hostname = parsedUrl.hostname
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$|^[a-f0-9:]+$/i

  if (ipRegex.test(hostname)) {
    // Direct IP address
    if (isBlockedIP(hostname)) {
      throw new Error(`IP address is blocked: ${hostname}`)
    }
  } else {
    // Hostname - resolve and validate
    await validateHostname(hostname)
  }
}

/**
 * Check rate limit for a user
 */
function checkRateLimit(userId: number): boolean {
  const now = Date.now()
  const oneMinuteAgo = now - 60000

  if (!rateLimitMap.has(userId)) {
    rateLimitMap.set(userId, [])
  }

  const timestamps = rateLimitMap.get(userId)!
  const recentRequests = timestamps.filter((t) => t > oneMinuteAgo)

  if (recentRequests.length >= 5) {
    return false
  }

  recentRequests.push(now)
  rateLimitMap.set(userId, recentRequests)

  // Clean up old entries
  if (rateLimitMap.size > 1000) {
    for (const [id, times] of rateLimitMap.entries()) {
      const filtered = times.filter((t) => t > oneMinuteAgo)
      if (filtered.length === 0) {
        rateLimitMap.delete(id)
      } else {
        rateLimitMap.set(id, filtered)
      }
    }
  }

  return true
}

// ---------------------------------------------------------------------------
// Main Connection Test Function
// ---------------------------------------------------------------------------

export async function testConnection(
  req: TestConnectionRequest,
  userId: number
): Promise<TestResult> {
  // Check rate limit
  if (!checkRateLimit(userId)) {
    throw new Error('RATE_LIMITED')
  }

  // Validate URL for SSRF
  try {
    await validateUrl(req.url)
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`SSRF_BLOCKED: ${error.message}`)
    }
    throw error
  }

  const timeout = Math.min(req.timeout || 10000, 30000)
  const startTime = performance.now()

  try {
    const startTime = performance.now()

    // Build headers
    const headers = new Headers({
      'Content-Type': 'application/json',
    })

    // Handle authentication
    if (req.username && req.password) {
      // Basic auth
      const credentials = `${req.username}:${req.password}`
      const encoded = Buffer.from(credentials).toString('base64')
      headers.set('Authorization', `Basic ${encoded}`)
    } else if (req.apiKey) {
      if (req.username) {
        // API key as X-Api-Key header
        headers.set('X-Api-Key', req.apiKey)
      } else {
        // API key as Bearer token
        headers.set('Authorization', `Bearer ${req.apiKey}`)
      }
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(req.url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const latencyMs = Math.round(performance.now() - startTime)

    return {
      success: response.ok,
      latencyMs,
      statusCode: response.status,
    }
  } catch (error) {
    const latencyMs = Math.round(performance.now() - startTime)

    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = `Request timeout (${timeout}ms)`
      } else {
        errorMessage = error.message
      }
    }

    return {
      success: false,
      latencyMs,
      error: errorMessage,
    }
  }
}

// Export for testing (allow direct validation testing)
export { validateUrl, isBlockedIP, isPrivateIP, validateHostname }

/** Clear rate limit state — testing only */
export function _resetRateLimit(): void {
  rateLimitMap.clear()
}
