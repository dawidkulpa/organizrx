import { describe, it, expect, mock } from 'bun:test'
import type { PluginAPI, PluginLogger, PluginSettings, PluginHTTP } from '@organizrx/plugin-sdk'
import { createApiRoutes } from './api'

// ---------------------------------------------------------------------------
// Mock Plugin API
// ---------------------------------------------------------------------------

function createMockAPI(
  settings: Record<string, string> = {},
  fetchMock: (url: string, options?: RequestInit) => Promise<Response> = async () =>
    new Response('{}')
): PluginAPI {
  const mockLogger: PluginLogger = {
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    debug: mock(() => {}),
  }

  const mockSettings: PluginSettings = {
    get: mock(async (key: string) => settings[key] || null),
    getNumber: mock(async (key: string, defaultValue?: number) => {
      const value = settings[key]
      return value ? parseFloat(value) : (defaultValue ?? 0)
    }),
    getBoolean: mock(async (key: string, defaultValue?: boolean) => {
      const value = settings[key]
      return value ? value === 'true' : (defaultValue ?? false)
    }),
    getJSON: mock(async <T>(key: string, defaultValue?: T): Promise<T> => {
      const value = settings[key]
      return value ? JSON.parse(value) : (defaultValue as T)
    }),
    set: mock(async (key: string, value: string) => {
      settings[key] = value
    }),
  }

  const mockHTTP: PluginHTTP = {
    fetch: mock(fetchMock),
  }

  return {
    logger: mockLogger,
    settings: mockSettings,
    http: mockHTTP,
  }
}

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const mockTorrentsResponse = [
  {
    hash: 'abc123',
    name: 'Ubuntu 22.04 LTS',
    size: 3774873600,
    progress: 0.5,
    dlspeed: 5242880,
    upspeed: 1048576,
    eta: 300,
    state: 'downloading',
    downloaded: 1887436800,
    uploaded: 209715200,
    ratio: 0.111,
    category: 'linux',
    tags: '',
    added_on: 1646092800,
    completion_on: 0,
    tracker: 'ubuntu.com',
    num_seeds: 50,
    num_leechs: 20,
    priority: 1,
  },
  {
    hash: 'def456',
    name: 'Debian 11',
    size: 2684354560,
    progress: 1.0,
    dlspeed: 0,
    upspeed: 524288,
    eta: 8640000,
    state: 'uploading',
    downloaded: 2684354560,
    uploaded: 5368709120,
    ratio: 2.0,
    category: 'linux',
    tags: '',
    added_on: 1646006400,
    completion_on: 1646010000,
    tracker: 'debian.org',
    num_seeds: 100,
    num_leechs: 5,
    priority: 1,
  },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('qBittorrent Plugin API', () => {
  describe('Configuration Validation', () => {
    it('should return 422 when settings are missing', async () => {
      const api = createMockAPI({})
      const app = createApiRoutes(api)

      const req = new Request('http://localhost/torrents')
      const res = await app.fetch(req)

      expect(res.status).toBe(422)
      const body = (await res.json()) as { error: { code: string } }
      expect(body.error.code).toBe('MISSING_CONFIG')
    })

    it('should return 422 when only URL is configured', async () => {
      const api = createMockAPI({ qbittorrent_url: 'http://localhost:8080' })
      const app = createApiRoutes(api)

      const req = new Request('http://localhost/torrents')
      const res = await app.fetch(req)

      expect(res.status).toBe(422)
      const body = (await res.json()) as { error: { code: string } }
      expect(body.error.code).toBe('MISSING_CONFIG')
    })

    it('should return 422 when URL and username are configured but not password', async () => {
      const api = createMockAPI({
        qbittorrent_url: 'http://localhost:8080',
        qbittorrent_username: 'admin',
      })
      const app = createApiRoutes(api)

      const req = new Request('http://localhost/torrents')
      const res = await app.fetch(req)

      expect(res.status).toBe(422)
      const body = (await res.json()) as { error: { code: string } }
      expect(body.error.code).toBe('MISSING_CONFIG')
    })
  })

  describe('Authentication', () => {
    it('should authenticate with qBittorrent on first request', async () => {
      let authCalled = false

      const fetchMock = mock(async (url: string, options?: RequestInit) => {
        const urlObj = new URL(url)

        if (urlObj.pathname.endsWith('/api/v2/auth/login')) {
          authCalled = true
          expect(options?.method).toBe('POST')
          expect(options?.headers).toMatchObject({
            'Content-Type': 'application/x-www-form-urlencoded',
          })
          return new Response('Ok.', {
            status: 200,
            headers: {
              'Set-Cookie': 'SID=test-session-id; Path=/; HttpOnly',
            },
          })
        }

        if (urlObj.pathname.endsWith('/api/v2/torrents/info')) {
          expect(options?.headers).toMatchObject({
            Cookie: 'SID=test-session-id',
          })
          return new Response(JSON.stringify(mockTorrentsResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        return new Response('Not Found', { status: 404 })
      })

      const api = createMockAPI(
        {
          qbittorrent_url: 'http://localhost:8080',
          qbittorrent_username: 'admin',
          qbittorrent_password: 'password',
        },
        fetchMock
      )

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/torrents')
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      expect(authCalled).toBe(true)
    })

    it('should return error when authentication fails', async () => {
      const fetchMock = mock(async (url: string) => {
        const urlObj = new URL(url)
        if (urlObj.pathname.endsWith('/api/v2/auth/login')) {
          return new Response('Fails.', { status: 403 })
        }
        return new Response('Not Found', { status: 404 })
      })

      const api = createMockAPI(
        {
          qbittorrent_url: 'http://localhost:8080',
          qbittorrent_username: 'admin',
          qbittorrent_password: 'wrong',
        },
        fetchMock
      )

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/torrents')
      const res = await app.fetch(req)

      expect(res.status).toBe(500)
      const body = (await res.json()) as { error: { code: string } }
      expect(body.error.code).toBe('FETCH_ERROR')
    })

    it('should return error when no session cookie is returned', async () => {
      const fetchMock = mock(async (url: string) => {
        const urlObj = new URL(url)
        if (urlObj.pathname.endsWith('/api/v2/auth/login')) {
          return new Response('Ok.', { status: 200 })
        }
        return new Response('Not Found', { status: 404 })
      })

      const api = createMockAPI(
        {
          qbittorrent_url: 'http://localhost:8080',
          qbittorrent_username: 'admin',
          qbittorrent_password: 'password',
        },
        fetchMock
      )

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/torrents')
      const res = await app.fetch(req)

      expect(res.status).toBe(500)
      const body = (await res.json()) as { error: { code: string } }
      expect(body.error.code).toBe('FETCH_ERROR')
    })
  })

  describe('GET /torrents', () => {
    it('should fetch torrents successfully', async () => {
      const fetchMock = mock(async (url: string, _options?: RequestInit) => {
        const urlObj = new URL(url)

        if (urlObj.pathname.endsWith('/api/v2/auth/login')) {
          return new Response('Ok.', {
            status: 200,
            headers: { 'Set-Cookie': 'SID=test-session-id; Path=/; HttpOnly' },
          })
        }

        if (urlObj.pathname.endsWith('/api/v2/torrents/info')) {
          return new Response(JSON.stringify(mockTorrentsResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        return new Response('Not Found', { status: 404 })
      })

      const api = createMockAPI(
        {
          qbittorrent_url: 'http://localhost:8080',
          qbittorrent_username: 'admin',
          qbittorrent_password: 'password',
        },
        fetchMock
      )

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/torrents')
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const body = (await res.json()) as { data: Array<{ hash: string }> }
      expect(body.data).toHaveLength(2)
      expect(body.data[0].hash).toBe('abc123')
      expect(body.data[1].hash).toBe('def456')
    })

    it('should return error when qBittorrent API fails', async () => {
      const fetchMock = mock(async (url: string) => {
        const urlObj = new URL(url)

        if (urlObj.pathname.endsWith('/api/v2/auth/login')) {
          return new Response('Ok.', {
            status: 200,
            headers: { 'Set-Cookie': 'SID=test-session-id; Path=/; HttpOnly' },
          })
        }

        if (urlObj.pathname.endsWith('/api/v2/torrents/info')) {
          return new Response('Internal Server Error', { status: 500 })
        }

        return new Response('Not Found', { status: 404 })
      })

      const api = createMockAPI(
        {
          qbittorrent_url: 'http://localhost:8080',
          qbittorrent_username: 'admin',
          qbittorrent_password: 'password',
        },
        fetchMock
      )

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/torrents')
      const res = await app.fetch(req)

      expect(res.status).toBe(500)
      const body = (await res.json()) as { error: { code: string } }
      expect(body.error.code).toBe('FETCH_ERROR')
    })
  })

  describe('POST /torrents/:hash/pause', () => {
    it('should pause torrent successfully', async () => {
      const fetchMock = mock(async (url: string, options?: RequestInit) => {
        const urlObj = new URL(url)

        if (urlObj.pathname.endsWith('/api/v2/auth/login')) {
          return new Response('Ok.', {
            status: 200,
            headers: { 'Set-Cookie': 'SID=test-session-id; Path=/; HttpOnly' },
          })
        }

        if (urlObj.pathname.endsWith('/api/v2/torrents/pause')) {
          expect(options?.method).toBe('POST')
          expect(urlObj.searchParams.get('hashes')).toBe('abc123')
          return new Response('', { status: 200 })
        }

        return new Response('Not Found', { status: 404 })
      })

      const api = createMockAPI(
        {
          qbittorrent_url: 'http://localhost:8080',
          qbittorrent_username: 'admin',
          qbittorrent_password: 'password',
        },
        fetchMock
      )

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/torrents/abc123/pause', { method: 'POST' })
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      await res.json()
    })

    it('should return error when pause fails', async () => {
      const fetchMock = mock(async (url: string) => {
        const urlObj = new URL(url)

        if (urlObj.pathname.endsWith('/api/v2/auth/login')) {
          return new Response('Ok.', {
            status: 200,
            headers: { 'Set-Cookie': 'SID=test-session-id; Path=/; HttpOnly' },
          })
        }

        if (urlObj.pathname.endsWith('/api/v2/torrents/pause')) {
          return new Response('Internal Server Error', { status: 500 })
        }

        return new Response('Not Found', { status: 404 })
      })

      const api = createMockAPI(
        {
          qbittorrent_url: 'http://localhost:8080',
          qbittorrent_username: 'admin',
          qbittorrent_password: 'password',
        },
        fetchMock
      )

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/torrents/abc123/pause', { method: 'POST' })
      const res = await app.fetch(req)

      expect(res.status).toBe(500)
      const body = (await res.json()) as { error: { code: string } }
      expect(body.error.code).toBe('ACTION_ERROR')
    })
  })

  describe('POST /torrents/:hash/resume', () => {
    it('should resume torrent successfully', async () => {
      const fetchMock = mock(async (url: string, options?: RequestInit) => {
        const urlObj = new URL(url)

        if (urlObj.pathname.endsWith('/api/v2/auth/login')) {
          return new Response('Ok.', {
            status: 200,
            headers: { 'Set-Cookie': 'SID=test-session-id; Path=/; HttpOnly' },
          })
        }

        if (urlObj.pathname.endsWith('/api/v2/torrents/resume')) {
          expect(options?.method).toBe('POST')
          expect(urlObj.searchParams.get('hashes')).toBe('def456')
          return new Response('', { status: 200 })
        }

        return new Response('Not Found', { status: 404 })
      })

      const api = createMockAPI(
        {
          qbittorrent_url: 'http://localhost:8080',
          qbittorrent_username: 'admin',
          qbittorrent_password: 'password',
        },
        fetchMock
      )

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/torrents/def456/resume', { method: 'POST' })
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const body = (await res.json()) as { data: { success: boolean } }
      expect(body.data.success).toBe(true)
    })

    it('should return error when resume fails', async () => {
      const fetchMock = mock(async (url: string) => {
        const urlObj = new URL(url)

        if (urlObj.pathname.endsWith('/api/v2/auth/login')) {
          return new Response('Ok.', {
            status: 200,
            headers: { 'Set-Cookie': 'SID=test-session-id; Path=/; HttpOnly' },
          })
        }

        if (urlObj.pathname.endsWith('/api/v2/torrents/resume')) {
          return new Response('Internal Server Error', { status: 500 })
        }

        return new Response('Not Found', { status: 404 })
      })

      const api = createMockAPI(
        {
          qbittorrent_url: 'http://localhost:8080',
          qbittorrent_username: 'admin',
          qbittorrent_password: 'password',
        },
        fetchMock
      )

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/torrents/def456/resume', { method: 'POST' })
      const res = await app.fetch(req)

      expect(res.status).toBe(500)
      const body = (await res.json()) as { error: { code: string } }
      expect(body.error.code).toBe('ACTION_ERROR')
    })
  })

  describe('Session Management', () => {
    it('should reuse session cookie for multiple requests', async () => {
      let authCallCount = 0

      const fetchMock = mock(async (url: string) => {
        const urlObj = new URL(url)

        if (urlObj.pathname.endsWith('/api/v2/auth/login')) {
          authCallCount++
          return new Response('Ok.', {
            status: 200,
            headers: { 'Set-Cookie': 'SID=test-session-id; Path=/; HttpOnly' },
          })
        }

        if (urlObj.pathname.endsWith('/api/v2/torrents/info')) {
          return new Response(JSON.stringify(mockTorrentsResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        return new Response('Not Found', { status: 404 })
      })

      const api = createMockAPI(
        {
          qbittorrent_url: 'http://localhost:8080',
          qbittorrent_username: 'admin',
          qbittorrent_password: 'password',
        },
        fetchMock
      )

      const app = createApiRoutes(api)

      // First request - should authenticate
      const req1 = new Request('http://localhost/torrents')
      const res1 = await app.fetch(req1)
      expect(res1.status).toBe(200)
      expect(authCallCount).toBe(1)

      // Second request - should reuse session
      const req2 = new Request('http://localhost/torrents')
      const res2 = await app.fetch(req2)
      expect(res2.status).toBe(200)
      expect(authCallCount).toBe(1)
    })
  })
})
