import { describe, it, expect, mock, beforeEach } from 'bun:test'
import type { PluginAPI } from '@organizrx/plugin-sdk'
import { createAPI } from './api'

// Mock PluginAPI
function createMockPluginAPI(overrides?: Partial<PluginAPI>): PluginAPI {
  return {
    settings: {
      get: mock(async (key: string) => {
        if (key === 'emby_url') return 'http://localhost:8096'
        if (key === 'emby_api_key') return 'test-api-key'
        return null
      }),
      getNumber: mock(async () => 0),
      getBoolean: mock(async () => false),
      getJSON: mock(async <T>(_key: string, _defaultValue?: T): Promise<T> => ({}) as T),
      set: mock(async () => {}),
    },
    logger: {
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
      debug: mock(() => {}),
    },
    http: {
      fetch: mock(async () => new Response(JSON.stringify([]), { status: 200 })),
    },
    ...overrides,
  }
}

describe('Emby Plugin API', () => {
  let api: PluginAPI

  beforeEach(() => {
    api = createMockPluginAPI()
  })

  describe('GET /sessions', () => {
    it('should return active sessions', async () => {
      const mockSessions = [
        {
          Id: 'session-1',
          UserId: 'user-1',
          UserName: 'TestUser',
          Client: 'Emby Web',
          DeviceName: 'Chrome',
          DeviceId: 'device-1',
          ApplicationVersion: '1.0.0',
          NowPlayingItem: {
            Id: 'item-1',
            Name: 'Test Movie',
            Type: 'Movie',
            ServerId: 'server-1',
          },
          PlayState: {
            PositionTicks: 10000000,
            IsPaused: false,
            PlayMethod: 'DirectPlay',
          },
        },
      ]

      api.http.fetch = mock(
        async () =>
          new Response(JSON.stringify(mockSessions), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
      )

      const app = createAPI(api)
      const req = new Request('http://localhost/sessions')
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data).toEqual(mockSessions)
      expect(api.http.fetch).toHaveBeenCalledTimes(1)
    })

    it('should filter out inactive sessions', async () => {
      const mockSessions = [
        {
          Id: 'session-1',
          UserId: 'user-1',
          UserName: 'ActiveUser',
          Client: 'Emby Web',
          DeviceName: 'Chrome',
          DeviceId: 'device-1',
          ApplicationVersion: '1.0.0',
          NowPlayingItem: {
            Id: 'item-1',
            Name: 'Test Movie',
            Type: 'Movie',
            ServerId: 'server-1',
          },
        },
        {
          Id: 'session-2',
          UserId: 'user-2',
          UserName: '',
          Client: 'Emby Web',
          DeviceName: 'Firefox',
          DeviceId: 'device-2',
          ApplicationVersion: '1.0.0',
        },
      ]

      api.http.fetch = mock(
        async () =>
          new Response(JSON.stringify(mockSessions), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
      )

      const app = createAPI(api)
      const req = new Request('http://localhost/sessions')
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data).toHaveLength(1)
      expect(json.data[0].Id).toBe('session-1')
    })

    it('should handle Emby API errors', async () => {
      api.http.fetch = mock(
        async () =>
          new Response('Not Found', {
            status: 404,
            statusText: 'Not Found',
          })
      )

      const app = createAPI(api)
      const req = new Request('http://localhost/sessions')
      const res = await app.fetch(req)

      expect(res.status).toBe(500)
      const json = await res.json()
      expect(json.error).toBeDefined()
      expect(json.error.code).toBe('FETCH_ERROR')
    })

    it('should handle missing configuration', async () => {
      api.settings.get = mock(async () => null)

      const app = createAPI(api)
      const req = new Request('http://localhost/sessions')
      const res = await app.fetch(req)

      expect(res.status).toBe(500)
      const json = await res.json()
      expect(json.error).toBeDefined()
      expect(json.error.message).toContain('configured')
    })
  })

  describe('GET /latest', () => {
    it('should return latest items', async () => {
      const mockUsers = [
        {
          Id: 'user-1',
          Name: 'Admin',
          Policy: {
            IsAdministrator: true,
          },
        },
      ]

      const mockItems = [
        {
          Id: 'item-1',
          Name: 'New Movie',
          Type: 'Movie',
          ServerId: 'server-1',
          ProductionYear: 2024,
        },
      ]

      let callCount = 0
      api.http.fetch = mock(async () => {
        callCount++
        if (callCount === 1) {
          return new Response(JSON.stringify(mockUsers), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return new Response(JSON.stringify(mockItems), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const app = createAPI(api)
      const req = new Request('http://localhost/latest')
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data).toEqual(mockItems)
      expect(api.http.fetch).toHaveBeenCalledTimes(2)
    })

    it('should validate limit parameter', async () => {
      const app = createAPI(api)
      const req = new Request('http://localhost/latest?limit=invalid')
      const res = await app.fetch(req)

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error.code).toBe('INVALID_LIMIT')
    })

    it('should enforce limit bounds', async () => {
      const app = createAPI(api)
      const req = new Request('http://localhost/latest?limit=100')
      const res = await app.fetch(req)

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error.code).toBe('INVALID_LIMIT')
    })

    it('should handle no admin user', async () => {
      const mockUsers = [
        {
          Id: 'user-1',
          Name: 'Regular',
          Policy: {
            IsAdministrator: false,
          },
        },
      ]

      api.http.fetch = mock(
        async () =>
          new Response(JSON.stringify(mockUsers), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
      )

      const app = createAPI(api)
      const req = new Request('http://localhost/latest')
      const res = await app.fetch(req)

      expect(res.status).toBe(500)
      const json = await res.json()
      expect(json.error.code).toBe('NO_ADMIN_USER')
    })
  })

  describe('GET /items/:id', () => {
    it('should return item metadata', async () => {
      const mockUsers = [
        {
          Id: 'user-1',
          Name: 'Admin',
          Policy: {
            IsAdministrator: true,
          },
        },
      ]

      const mockItem = {
        Id: 'item-1',
        Name: 'Test Movie',
        Type: 'Movie',
        ServerId: 'server-1',
        Overview: 'A test movie',
        ProductionYear: 2024,
      }

      let callCount = 0
      api.http.fetch = mock(async () => {
        callCount++
        if (callCount === 1) {
          return new Response(JSON.stringify(mockUsers), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return new Response(JSON.stringify(mockItem), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const app = createAPI(api)
      const req = new Request('http://localhost/items/item-1')
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data).toEqual(mockItem)
      expect(api.http.fetch).toHaveBeenCalledTimes(2)
    })

    it('should validate item ID', async () => {
      const app = createAPI(api)
      const req = new Request('http://localhost/items/')
      const res = await app.fetch(req)

      expect(res.status).toBe(404)
    })
  })
})
