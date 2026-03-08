import { describe, it, expect } from 'bun:test'
import { isIframeAllowedByHeaders } from './tab-url-check'

describe('tab-url-check service', () => {
  it('blocks iframe when X-Frame-Options is DENY', () => {
    const headers = new Headers({
      'X-Frame-Options': 'DENY',
    })

    const allowed = isIframeAllowedByHeaders(
      headers,
      'https://example.com',
      'http://localhost:5173'
    )
    expect(allowed).toBe(false)
  })

  it('blocks iframe when X-Frame-Options is SAMEORIGIN and embedder differs', () => {
    const headers = new Headers({
      'X-Frame-Options': 'SAMEORIGIN',
    })

    const allowed = isIframeAllowedByHeaders(
      headers,
      'https://example.com',
      'http://localhost:5173'
    )
    expect(allowed).toBe(false)
  })

  it('blocks iframe when CSP frame-ancestors is none', () => {
    const headers = new Headers({
      'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'",
    })

    const allowed = isIframeAllowedByHeaders(
      headers,
      'https://example.com',
      'http://localhost:5173'
    )
    expect(allowed).toBe(false)
  })

  it('allows iframe when CSP frame-ancestors allows embedder origin', () => {
    const headers = new Headers({
      'Content-Security-Policy': 'frame-ancestors http://localhost:5173 https://organizrx.local',
    })

    const allowed = isIframeAllowedByHeaders(
      headers,
      'https://example.com',
      'http://localhost:5173'
    )
    expect(allowed).toBe(true)
  })
})
