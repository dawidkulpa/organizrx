// ---------------------------------------------------------------------------
// CIDR Parsing & IP Validation
// ---------------------------------------------------------------------------

interface CIDR {
  base: bigint
  mask: bigint
  version: 4 | 6
}

export function parseCIDR(cidr: string): CIDR | null {
  const parts = cidr.split('/')
  const ipPart = parts[0]
  const prefixLen = parts[1] ? parseInt(parts[1], 10) : null

  // Detect IPv4 vs IPv6
  const isIPv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(ipPart)
  const isIPv6 = ipPart.includes(':')

  if (isIPv4) {
    const octets = ipPart.split('.').map((o) => parseInt(o, 10))
    if (octets.length !== 4 || octets.some((o) => o < 0 || o > 255)) return null

    const ipNum = BigInt((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3])
    const prefix = prefixLen ?? 32
    if (prefix < 0 || prefix > 32) return null

    const mask = prefix === 0 ? 0n : (0xffffffffn << BigInt(32 - prefix)) & 0xffffffffn
    const base = ipNum & mask

    return { base, mask, version: 4 }
  }

  if (isIPv6) {
    // Expand IPv6 address
    const expanded = expandIPv6(ipPart)
    if (!expanded) return null

    const ipNum = ipv6ToBigInt(expanded)
    const prefix = prefixLen ?? 128
    if (prefix < 0 || prefix > 128) return null

    const mask = prefix === 0 ? 0n : (2n ** 128n - 1n) << BigInt(128 - prefix)
    const base = ipNum & mask

    return { base, mask, version: 6 }
  }

  return null
}

function expandIPv6(ip: string): string | null {
  // Expand :: notation
  const parts = ip.split('::')
  if (parts.length > 2) return null

  let left = parts[0] ? parts[0].split(':') : []
  let right = parts.length === 2 ? (parts[1] ? parts[1].split(':') : []) : []

  // If no ::, must be 8 groups
  if (parts.length === 1) {
    if (left.length !== 8) return null
    return left.map((g) => g.padStart(4, '0')).join(':')
  }

  // Expand ::
  const missing = 8 - (left.length + right.length)
  if (missing < 0) return null

  const middle = Array(missing).fill('0000')
  const full = [...left, ...middle, ...right]
  return full.map((g) => g.padStart(4, '0')).join(':')
}

function ipv6ToBigInt(ip: string): bigint {
  const groups = ip.split(':')
  let result = 0n
  for (const group of groups) {
    result = (result << 16n) | BigInt(parseInt(group, 16))
  }
  return result
}

function ipv4ToBigInt(ip: string): bigint {
  const octets = ip.split('.').map((o) => parseInt(o, 10))
  return BigInt((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3])
}

export function ipInRange(ip: string, cidr: CIDR): boolean {
  if (cidr.version === 4) {
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return false
    const ipNum = ipv4ToBigInt(ip)
    return (ipNum & cidr.mask) === cidr.base
  } else {
    // IPv6
    const expanded = expandIPv6(ip)
    if (!expanded) return false
    const ipNum = ipv6ToBigInt(expanded)
    return (ipNum & cidr.mask) === cidr.base
  }
}

export function isTrustedProxy(ip: string, whitelist: string[]): boolean {
  for (const entry of whitelist) {
    if (entry === ip) return true

    const cidr = parseCIDR(entry)
    if (cidr && ipInRange(ip, cidr)) return true
  }
  return false
}
