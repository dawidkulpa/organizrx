import { Hono } from 'hono'
import type { PluginAPI } from '@organizrx/plugin-sdk'

// ---------------------------------------------------------------------------
// SABnzbd API Response Types
// ---------------------------------------------------------------------------

interface SabnzbdSlot {
  nzo_id: string
  filename: string
  mb: string
  mbleft: string
  size: string
  sizeleft: string
  percentage: string
  status: string
  timeleft: string
  eta: string
  priority: string
  category: string
}

interface SabnzbdQueueResponse {
  queue: {
    status: string
    paused: boolean
    speed: string
    speedlimit: string
    speedlimit_abs: string
    kbpersec: string
    mb: string
    mbleft: string
    sizeleft: string
    noofslots: number
    slots: SabnzbdSlot[]
    timeleft: string
    eta: string
  }
}

interface SabnzbdHistorySlot {
  nzo_id: string
  name: string
  size: string
  category: string
  status: string
  fail_message: string
  completed: number
  download_time: number
  storage: string
  bytes: number
}

interface SabnzbdHistoryResponse {
  history: {
    total_size: string
    slots: SabnzbdHistorySlot[]
  }
}

interface SabnzbdActionResponse {
  status: boolean
}

// ---------------------------------------------------------------------------
// SABnzbd API Client
// ---------------------------------------------------------------------------

class SabnzbdClient {
  constructor(
    private api: PluginAPI,
    private baseUrl: string,
    private apiKey: string
  ) {}

  private async fetch<T>(params: Record<string, string>): Promise<T> {
    const url = new URL(this.baseUrl)
    url.pathname = url.pathname.replace(/\/$/, '') + '/api'
    url.searchParams.set('output', 'json')
    url.searchParams.set('apikey', this.apiKey)

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }

    this.api.logger.debug('SABnzbd API request', { url: url.toString() })

    const response = await this.api.http.fetch(url.toString())

    if (!response.ok) {
      throw new Error(`SABnzbd API error: ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as T
    return data
  }

  async getQueue(): Promise<SabnzbdQueueResponse> {
    return this.fetch<SabnzbdQueueResponse>({ mode: 'queue' })
  }

  async getHistory(limit = 100): Promise<SabnzbdHistoryResponse> {
    return this.fetch<SabnzbdHistoryResponse>({
      mode: 'history',
      limit: limit.toString(),
    })
  }

  async pause(): Promise<SabnzbdActionResponse> {
    return this.fetch<SabnzbdActionResponse>({ mode: 'pause' })
  }

  async resume(): Promise<SabnzbdActionResponse> {
    return this.fetch<SabnzbdActionResponse>({ mode: 'resume' })
  }

  async pauseItem(nzoId: string): Promise<SabnzbdActionResponse> {
    return this.fetch<SabnzbdActionResponse>({
      mode: 'queue',
      name: 'pause',
      value: nzoId,
    })
  }

  async resumeItem(nzoId: string): Promise<SabnzbdActionResponse> {
    return this.fetch<SabnzbdActionResponse>({
      mode: 'queue',
      name: 'resume',
      value: nzoId,
    })
  }
}

// ---------------------------------------------------------------------------
// Hono Routes
// ---------------------------------------------------------------------------

export function createApiRoutes(api: PluginAPI) {
  const app = new Hono()

  // Middleware to create SABnzbd client from settings
  app.use('*', async (c, next) => {
    const baseUrl = await api.settings.get('sabnzbd_url')
    const apiKey = await api.settings.get('sabnzbd_api_key')

    if (!baseUrl || !apiKey) {
      return c.json(
        {
          error: {
            code: 'MISSING_CONFIG',
            message: 'SABnzbd URL and API key must be configured',
          },
        },
        422
      )
    }

    const client = new SabnzbdClient(api, baseUrl, apiKey)
    c.set('sabnzbd', client)

    return next()
  })

  // GET /queue - Get download queue
  app.get('/queue', async (c) => {
    try {
      const client = c.get('sabnzbd') as SabnzbdClient
      const data = await client.getQueue()
      return c.json({ data })
    } catch (error) {
      api.logger.error('Failed to fetch queue', {
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json(
        {
          error: {
            code: 'FETCH_ERROR',
            message: error instanceof Error ? error.message : 'Failed to fetch queue',
          },
        },
        500
      )
    }
  })

  // GET /history - Get download history
  app.get('/history', async (c) => {
    try {
      const client = c.get('sabnzbd') as SabnzbdClient
      const limit = c.req.query('limit')
      const data = await client.getHistory(limit ? parseInt(limit, 10) : 100)
      return c.json({ data })
    } catch (error) {
      api.logger.error('Failed to fetch history', {
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json(
        {
          error: {
            code: 'FETCH_ERROR',
            message: error instanceof Error ? error.message : 'Failed to fetch history',
          },
        },
        500
      )
    }
  })

  // POST /pause - Pause entire queue
  app.post('/pause', async (c) => {
    try {
      const client = c.get('sabnzbd') as SabnzbdClient
      const data = await client.pause()
      return c.json({ data })
    } catch (error) {
      api.logger.error('Failed to pause queue', {
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json(
        {
          error: {
            code: 'ACTION_ERROR',
            message: error instanceof Error ? error.message : 'Failed to pause queue',
          },
        },
        500
      )
    }
  })

  // POST /resume - Resume entire queue
  app.post('/resume', async (c) => {
    try {
      const client = c.get('sabnzbd') as SabnzbdClient
      const data = await client.resume()
      return c.json({ data })
    } catch (error) {
      api.logger.error('Failed to resume queue', {
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json(
        {
          error: {
            code: 'ACTION_ERROR',
            message: error instanceof Error ? error.message : 'Failed to resume queue',
          },
        },
        500
      )
    }
  })

  // POST /pause/:id - Pause specific download
  app.post('/pause/:id', async (c) => {
    try {
      const client = c.get('sabnzbd') as SabnzbdClient
      const id = c.req.param('id')
      const data = await client.pauseItem(id)
      return c.json({ data })
    } catch (error) {
      api.logger.error('Failed to pause item', {
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json(
        {
          error: {
            code: 'ACTION_ERROR',
            message: error instanceof Error ? error.message : 'Failed to pause item',
          },
        },
        500
      )
    }
  })

  // POST /resume/:id - Resume specific download
  app.post('/resume/:id', async (c) => {
    try {
      const client = c.get('sabnzbd') as SabnzbdClient
      const id = c.req.param('id')
      const data = await client.resumeItem(id)
      return c.json({ data })
    } catch (error) {
      api.logger.error('Failed to resume item', {
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json(
        {
          error: {
            code: 'ACTION_ERROR',
            message: error instanceof Error ? error.message : 'Failed to resume item',
          },
        },
        500
      )
    }
  })

  return app
}
