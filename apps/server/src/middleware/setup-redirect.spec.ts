import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'

import { createSetupRedirectMiddleware, isDocumentRequest } from './setup-redirect'

describe('setup redirect middleware', () => {
  it('identifies HTML document requests correctly', () => {
    expect(isDocumentRequest('/', 'text/html')).toBe(true)
    expect(isDocumentRequest('/users', 'text/html,application/xhtml+xml')).toBe(true)
    expect(isDocumentRequest('/assets/index.js', '*/*')).toBe(false)
    expect(isDocumentRequest('/favicon.ico', 'image/avif,image/webp,*/*')).toBe(false)
    expect(isDocumentRequest('/api/health', 'application/json')).toBe(false)
    expect(isDocumentRequest('/wizard', 'text/html')).toBe(false)
  })

  it('redirects fresh-install document requests to /wizard', async () => {
    const app = new Hono()
    app.use(
      '*',
      createSetupRedirectMiddleware(async () => false)
    )
    app.get('*', (c) => c.text('ok'))

    const res = await app.request('/', {
      headers: { accept: 'text/html' },
    })

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/wizard')
  })

  it('does not redirect API or static asset requests', async () => {
    const app = new Hono()
    app.use(
      '*',
      createSetupRedirectMiddleware(async () => false)
    )
    app.get('/api/health', (c) => c.json({ status: 'ok' }))
    app.get('/assets/index.js', (c) => c.text('asset'))

    const apiRes = await app.request('/api/health', {
      headers: { accept: 'application/json' },
    })
    const assetRes = await app.request('/assets/index.js', {
      headers: { accept: '*/*' },
    })

    expect(apiRes.status).toBe(200)
    expect(assetRes.status).toBe(200)
  })

  it('does not redirect once setup is complete', async () => {
    const app = new Hono()
    app.use(
      '*',
      createSetupRedirectMiddleware(async () => true)
    )
    app.get('*', (c) => c.text('ok'))

    const res = await app.request('/login', {
      headers: { accept: 'text/html' },
    })

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
  })
})
