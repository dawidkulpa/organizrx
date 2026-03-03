import { Hono } from 'hono'
import type { PluginAPI } from '@organizrx/plugin-sdk'

// ---------------------------------------------------------------------------
// Hono Context Types
// ---------------------------------------------------------------------------

type Variables = {
  qbittorrent: QBittorrentClient
}

// ---------------------------------------------------------------------------
// qBittorrent API Response Types
// ---------------------------------------------------------------------------

interface QBittorrentTorrent {
  hash: string
  name: string
  size: number
  progress: number
  dlspeed: number
  upspeed: number
  eta: number
  state: string
  downloaded: number
  uploaded: number
  ratio: number
  category: string
  tags: string
  added_on: number
  completion_on: number
  tracker: string
  num_seeds: number
  num_leechs: number
  priority: number
}


// ---------------------------------------------------------------------------
// qBittorrent API Client
// ---------------------------------------------------------------------------

class QBittorrentClient {
  private sid: string | null = null
  private sidExpiry: number = 0

  constructor(
    private api: PluginAPI,
    private baseUrl: string,
    private username: string,
    private password: string
  ) {}

  private async authenticate(): Promise<void> {
    const now = Date.now()

    // Reuse existing SID if still valid (expires after 1 hour by default)
    if (this.sid && now < this.sidExpiry) {
      return
    }

    const url = new URL(this.baseUrl)
    url.pathname = url.pathname.replace(/\/$/, '') + '/api/v2/auth/login'

    const formData = new URLSearchParams()
    formData.append('username', this.username)
    formData.append('password', this.password)

    this.api.logger.debug('qBittorrent auth request', { url: url.toString() })

    const response = await this.api.http.fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    if (!response.ok) {
      throw new Error(`qBittorrent auth failed: ${response.status} ${response.statusText}`)
    }

    // Extract SID from Set-Cookie header
    const setCookie = response.headers.get('set-cookie')
    if (!setCookie) {
      throw new Error('qBittorrent auth failed: No session cookie returned')
    }

    const sidMatch = setCookie.match(/SID=([^;]+)/)
    if (!sidMatch) {
      throw new Error('qBittorrent auth failed: Invalid session cookie format')
    }

    this.sid = sidMatch[1]
    // Set expiry to 50 minutes (conservative estimate, qBittorrent default is 1 hour)
    this.sidExpiry = now + 50 * 60 * 1000

    this.api.logger.debug('qBittorrent authenticated successfully')
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    await this.authenticate()

    const baseUrlObj = new URL(this.baseUrl)
    // Handle path that may include query parameters
    const [pathOnly, queryString] = path.split('?')
    const url = new URL(baseUrlObj)
    url.pathname = url.pathname.replace(/\/$/, '') + pathOnly
    if (queryString) {
      url.search = '?' + queryString
    }

    this.api.logger.debug('qBittorrent API request', { url: url.toString() })

    const response = await this.api.http.fetch(url.toString(), {
      ...options,
      headers: {
        ...options?.headers,
        Cookie: `SID=${this.sid}`,
      },
    })

    if (!response.ok) {
      throw new Error(`qBittorrent API error: ${response.status} ${response.statusText}`)
    }

    // Some endpoints return empty response on success
    const text = await response.text()
    if (!text) {
      return {} as T
    }

    const data = JSON.parse(text) as T
    return data
  }

  async getTorrents(): Promise<QBittorrentTorrent[]> {
    return this.fetch<QBittorrentTorrent[]>('/api/v2/torrents/info')
  }

  async pauseTorrent(hash: string): Promise<void> {
    const url = `/api/v2/torrents/pause`
    const fullPath = `${url}?hashes=${hash}`
    await this.fetch<void>(fullPath, {
      method: 'POST',
    })
  }

  async resumeTorrent(hash: string): Promise<void> {
    const url = `/api/v2/torrents/resume`
    const fullPath = `${url}?hashes=${hash}`
    await this.fetch<void>(fullPath, {
      method: 'POST',
    })
  }
}

// ---------------------------------------------------------------------------
// Hono Routes
// ---------------------------------------------------------------------------

export function createApiRoutes(api: PluginAPI) {
  const app = new Hono<{ Variables: Variables }>()
  let clientInstance: QBittorrentClient | null = null

  // Middleware to create qBittorrent client from settings
  app.use('*', async (c, next) => {
    const baseUrl = await api.settings.get('qbittorrent_url')
    const username = await api.settings.get('qbittorrent_username')
    const password = await api.settings.get('qbittorrent_password')

    if (!baseUrl || !username || !password) {
      return c.json(
        {
          error: {
            code: 'MISSING_CONFIG',
            message: 'qBittorrent URL, username, and password must be configured',
          },
        },
        422
      )
    }

    // Reuse client instance to maintain session
    if (!clientInstance) {
      clientInstance = new QBittorrentClient(api, baseUrl, username, password)
    }
    c.set('qbittorrent', clientInstance)

    return await next()
  })

  // GET /torrents - Get torrent list
  app.get('/torrents', async (c) => {
    try {
      const client = c.get('qbittorrent') as QBittorrentClient
      const data = await client.getTorrents()
      return c.json({ data })
    } catch (error) {
      api.logger.error('Failed to fetch torrents', {
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json(
        {
          error: {
            code: 'FETCH_ERROR',
            message: error instanceof Error ? error.message : 'Failed to fetch torrents',
          },
        },
        500
      )
    }
  })

  // POST /torrents/:hash/pause - Pause torrent
  app.post('/torrents/:hash/pause', async (c) => {
    try {
      const client = c.get('qbittorrent') as QBittorrentClient
      const hash = c.req.param('hash')
      await client.pauseTorrent(hash)
      return c.json({ data: { success: true } })
    } catch (error) {
      api.logger.error('Failed to pause torrent', {
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json(
        {
          error: {
            code: 'ACTION_ERROR',
            message: error instanceof Error ? error.message : 'Failed to pause torrent',
          },
        },
        500
      )
    }
  })

  // POST /torrents/:hash/resume - Resume torrent
  app.post('/torrents/:hash/resume', async (c) => {
    try {
      const client = c.get('qbittorrent') as QBittorrentClient
      const hash = c.req.param('hash')
      await client.resumeTorrent(hash)
      return c.json({ data: { success: true } })
    } catch (error) {
      api.logger.error('Failed to resume torrent', {
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json(
        {
          error: {
            code: 'ACTION_ERROR',
            message: error instanceof Error ? error.message : 'Failed to resume torrent',
          },
        },
        500
      )
    }
  })

  return app
}
