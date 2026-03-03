import { Hono } from 'hono'
import type { PluginAPI } from '@organizrx/plugin-sdk'

export function createOverseerrAPI(api: PluginAPI) {
  const app = new Hono()

  // Helper to get Overseerr configuration
  async function getOverseerrConfig() {
    const url = await api.settings.get('overseerr_url')
    const apiKey = await api.settings.get('overseerr_api_key')

    if (!url || !apiKey) {
      throw new Error('Overseerr URL and API key must be configured')
    }

    return { url: url.replace(/\/$/, ''), apiKey }
  }

  // Helper to make authenticated requests to Overseerr
  async function overseerrFetch(endpoint: string, options: RequestInit = {}) {
    const { url, apiKey } = await getOverseerrConfig()
    const fullUrl = `${url}${endpoint}`

    const headers = {
      Accept: 'application/json',
      'X-Api-Key': apiKey,
      ...options.headers,
    }

    try {
      const response = await api.http.fetch(fullUrl, {
        ...options,
        headers,
      })

      if (!response.ok) {
        const errorText = await response.text()
        api.logger.error('Overseerr API error', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        })
        throw new Error(`Overseerr API error: ${response.statusText}`)
      }

      return response
    } catch (error) {
      api.logger.error('Failed to fetch from Overseerr', {
        endpoint,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  // GET /requests - List all requests
  app.get('/requests', async (c) => {
    try {
      const take = c.req.query('take') ?? '50'
      const skip = c.req.query('skip') ?? '0'

      const response = await overseerrFetch(`/api/v1/request?take=${take}&skip=${skip}`)

      const data = await response.json()
      return c.json({ data })
    } catch (error) {
      api.logger.error('Failed to fetch requests', {
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json(
        {
          error: {
            code: 'FETCH_FAILED',
            message: error instanceof Error ? error.message : 'Failed to fetch requests',
          },
        },
        500
      )
    }
  })

  // GET /requests/:id - Get specific request details
  app.get('/requests/:id', async (c) => {
    try {
      const requestId = c.req.param('id')

      const response = await overseerrFetch(`/api/v1/request/${requestId}`)
      const data = await response.json()

      return c.json({ data })
    } catch (error) {
      api.logger.error('Failed to fetch request details', {
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json(
        {
          error: {
            code: 'FETCH_FAILED',
            message: error instanceof Error ? error.message : 'Failed to fetch request details',
          },
        },
        500
      )
    }
  })

  // POST /requests/:id/approve - Approve a request
  app.post('/requests/:id/approve', async (c) => {
    try {
      const requestId = c.req.param('id')

      const response = await overseerrFetch(`/api/v1/request/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      api.logger.info('Request approved', { requestId })

      return c.json({ data })
    } catch (error) {
      api.logger.error('Failed to approve request', {
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json(
        {
          error: {
            code: 'APPROVE_FAILED',
            message: error instanceof Error ? error.message : 'Failed to approve request',
          },
        },
        500
      )
    }
  })

  // POST /requests/:id/deny - Deny a request
  app.post('/requests/:id/deny', async (c) => {
    try {
      const requestId = c.req.param('id')

      const response = await overseerrFetch(`/api/v1/request/${requestId}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      api.logger.info('Request denied', { requestId })

      return c.json({ data })
    } catch (error) {
      api.logger.error('Failed to deny request', {
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json(
        {
          error: {
            code: 'DENY_FAILED',
            message: error instanceof Error ? error.message : 'Failed to deny request',
          },
        },
        500
      )
    }
  })

  return app
}
