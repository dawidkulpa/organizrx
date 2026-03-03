import { describe, it, expect, mock, beforeEach } from 'bun:test'
import type { PluginAPI, PluginSettings, PluginLogger, PluginHTTP } from '@organizrx/plugin-sdk'
import { createOverseerrAPI } from './api'

// Mock PluginAPI
function createMockPluginAPI(): PluginAPI {
  const settingsStore = new Map<string, string>()

  const mockSettings: PluginSettings = {
    get: mock(async (key: string) => settingsStore.get(key) ?? null),
    getNumber: mock(async (key: string, defaultValue?: number) => {
      const value = settingsStore.get(key)
      return value ? Number(value) : (defaultValue ?? 0)
    }),
    getBoolean: mock(async (key: string, defaultValue?: boolean) => {
      const value = settingsStore.get(key)
      return value ? value === 'true' : (defaultValue ?? false)
    }),
    getJSON: mock(async <T>(key: string, defaultValue?: T) => {
      const value = settingsStore.get(key)
      return value ? JSON.parse(value) : (defaultValue ?? null)
    }),
    set: mock(async (key: string, value: string) => {
      settingsStore.set(key, value)
    }),
  }

  const mockLogger: PluginLogger = {
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    debug: mock(() => {}),
  }

  const mockHTTP: PluginHTTP = {
    fetch: mock(async (url: string, options?: RequestInit) => {
      // Default mock response
      return new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  }

  return {
    settings: mockSettings,
    logger: mockLogger,
    http: mockHTTP,
  }
}

describe('Overseerr API', () => {
  let api: PluginAPI
  let app: ReturnType<typeof createOverseerrAPI>

  beforeEach(async () => {
    api = createMockPluginAPI()

    // Set default configuration
    await api.settings.set('overseerr_url', 'https://overseerr.example.com')
    await api.settings.set('overseerr_api_key', 'test-api-key')

    app = createOverseerrAPI(api)
  })

  describe('GET /requests', () => {
    it('should fetch requests successfully', async () => {
      const mockResponse = {
        results: [
          {
            id: 1,
            status: 1,
            media: {
              tmdbId: 12345,
              status: 3,
              posterPath: '/test.jpg',
            },
            type: 'movie',
            requestedBy: {
              username: 'testuser',
              displayName: 'Test User',
            },
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        pageInfo: {
          pages: 1,
          pageSize: 50,
          results: 1,
          page: 1,
        },
      }

      api.http.fetch = mock(async () => {
        return new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const req = new Request('http://localhost/requests?take=50&skip=0')
      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data.results).toHaveLength(1)
      expect(data.data.results[0].id).toBe(1)
    })

    it('should handle missing configuration', async () => {
      await api.settings.set('overseerr_url', '')

      const req = new Request('http://localhost/requests')
      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe('FETCH_FAILED')
    })

    it('should handle API errors', async () => {
      api.http.fetch = mock(async () => {
        return new Response('Not Found', {
          status: 404,
          statusText: 'Not Found',
        })
      })

      const req = new Request('http://localhost/requests')
      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data.error).toBeDefined()
    })
  })

  describe('GET /requests/:id', () => {
    it('should fetch request details successfully', async () => {
      const mockRequest = {
        id: 1,
        status: 1,
        media: {
          tmdbId: 12345,
          title: 'Test Movie',
        },
      }

      api.http.fetch = mock(async () => {
        return new Response(JSON.stringify(mockRequest), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const req = new Request('http://localhost/requests/1')
      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data.id).toBe(1)
    })
  })

  describe('POST /requests/:id/approve', () => {
    it('should approve request successfully', async () => {
      const mockResponse = {
        id: 1,
        status: 2,
      }

      api.http.fetch = mock(async () => {
        return new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const req = new Request('http://localhost/requests/1/approve', {
        method: 'POST',
      })
      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data.status).toBe(2)
      expect(api.logger.info).toHaveBeenCalledWith('Request approved', { requestId: '1' })
    })

    it('should handle approve errors', async () => {
      api.http.fetch = mock(async () => {
        return new Response('Unauthorized', {
          status: 401,
          statusText: 'Unauthorized',
        })
      })

      const req = new Request('http://localhost/requests/1/approve', {
        method: 'POST',
      })
      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data.error.code).toBe('APPROVE_FAILED')
    })
  })

  describe('POST /requests/:id/deny', () => {
    it('should deny request successfully', async () => {
      const mockResponse = {
        id: 1,
        status: 3,
      }

      api.http.fetch = mock(async () => {
        return new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const req = new Request('http://localhost/requests/1/deny', {
        method: 'POST',
      })
      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data.status).toBe(3)
      expect(api.logger.info).toHaveBeenCalledWith('Request denied', { requestId: '1' })
    })

    it('should handle deny errors', async () => {
      api.http.fetch = mock(async () => {
        return new Response('Internal Server Error', {
          status: 500,
          statusText: 'Internal Server Error',
        })
      })

      const req = new Request('http://localhost/requests/1/deny', {
        method: 'POST',
      })
      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data.error.code).toBe('DENY_FAILED')
    })
  })

  describe('Configuration validation', () => {
    it('should require overseerr_url', async () => {
      await api.settings.set('overseerr_url', '')

      const req = new Request('http://localhost/requests')
      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data.error).toBeDefined()
    })

    it('should require overseerr_api_key', async () => {
      await api.settings.set('overseerr_api_key', '')

      const req = new Request('http://localhost/requests')
      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data.error).toBeDefined()
    })

    it('should remove trailing slash from URL', async () => {
      await api.settings.set('overseerr_url', 'https://overseerr.example.com/')

      api.http.fetch = mock(async (url: string) => {
        expect(url).toBe('https://overseerr.example.com/api/v1/request?take=50&skip=0')
        return new Response(JSON.stringify({ results: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const req = new Request('http://localhost/requests?take=50&skip=0')
      await app.fetch(req)

      expect(api.http.fetch).toHaveBeenCalled()
    })
  })

  describe('HTTP headers', () => {
    it('should include X-Api-Key header', async () => {
      api.http.fetch = mock(async (url: string, options?: RequestInit) => {
        const headers = new Headers(options?.headers)
        expect(headers.get('X-Api-Key')).toBe('test-api-key')
        expect(headers.get('Accept')).toBe('application/json')

        return new Response(JSON.stringify({ results: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const req = new Request('http://localhost/requests')
      await app.fetch(req)

      expect(api.http.fetch).toHaveBeenCalled()
    })
  })
})
