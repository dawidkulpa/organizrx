import type { Context, Next } from 'hono'

import { checkSetupComplete } from '../services/setup'

const FILE_EXTENSION_RE = /\/[^/?]+\.[^/]+$/

function isDocumentRequest(path: string, acceptHeader?: string): boolean {
  if (path.startsWith('/api/')) return false
  if (path === '/wizard') return false
  if (FILE_EXTENSION_RE.test(path)) return false

  if (!acceptHeader) return true

  return acceptHeader.includes('text/html') || acceptHeader.includes('*/*')
}

export function createSetupRedirectMiddleware(
  checkSetup: () => Promise<boolean> = checkSetupComplete
) {
  return async (c: Context, next: Next) => {
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      return next()
    }

    const path = c.req.path
    const acceptHeader = c.req.header('accept')

    if (!isDocumentRequest(path, acceptHeader)) {
      return next()
    }

    const setupComplete = await checkSetup()
    if (!setupComplete) {
      return c.redirect('/wizard', 302)
    }

    return next()
  }
}

export { isDocumentRequest }
