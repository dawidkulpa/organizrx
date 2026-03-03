import { describe, expect, it, mock, beforeEach } from 'bun:test'
import type { PluginAPI } from '@organizrx/plugin-sdk'
import { createJellyfinAPI } from './api'

// ---------------------------------------------------------------------------
// Mock PluginAPI
// ---------------------------------------------------------------------------
function createMockAPI(): PluginAPI {
  const settings = new Map<string, string>()

  return {
    settings: {
      get: mock(async (key: string) => settings.get(key) || null),
      getNumber: mock(async (key: string, defaultValue?: number) => {
        const value = settings.get(key)
        return value ? Number(value) : (defaultValue ?? 0)
      }),
      getBoolean: mock(async (key: string, defaultValue?: boolean) => {
        const value = settings.get(key)
        return value === 'true' ? true : value === 'false' ? false : (defaultValue ?? false)
      }),
      getJSON: mock(async <T>(key: string, defaultValue?: T): Promise<T> => {
        const value = settings.get(key)
        return value ? JSON.parse(value) : (defaultValue as T)
      }),
      set: mock(async (key: string, value: string) => {
        settings.set(key, value)
      }),
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
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Jellyfin API', () => {
  let api: PluginAPI
  let app: ReturnType<typeof createJellyfinAPI>

  beforeEach(() => {
    api = createMockAPI()
    app = createJellyfinAPI(api)
  })

  describe('GET /sessions', () => {
    it('returns 422 when jellyfin_url is missing', async () => {
      const req = new Request('http://localhost/sessions')
      const res = await app.fetch(req)

      expect(res.status).toBe(422)
      const json = await res.json()
      expect(json.error.code).toBe('CONFIG_MISSING')
    })

    it('returns 422 when jellyfin_api_key is missing', async () => {
      await api.settings.set('jellyfin_url', 'http://jellyfin.local')

      const req = new Request('http://localhost/sessions')
      const res = await app.fetch(req)

      expect(res.status).toBe(422)
      const json = await res.json()
      expect(json.error.code).toBe('CONFIG_MISSING')
    })

    it('returns active sessions successfully', async () => {
      await api.settings.set('jellyfin_url', 'http://jellyfin.local')
      await api.settings.set('jellyfin_api_key', 'test-key-123')

      const mockSessions = [
        {
          Id: 'session-1',
          UserName: 'testuser',
          Client: 'Web',
          DeviceName: 'Chrome',
          PlayState: { IsPaused: false },
          NowPlayingItem: {
            Id: 'item-1',
            ServerId: 'server-1',
            Name: 'Test Movie',
            Type: 'Movie',
            RunTimeTicks: 72000000000,
          },
        },
      ]

      api.http.fetch = mock(async () => new Response(JSON.stringify(mockSessions), { status: 200 }))

      const req = new Request('http://localhost/sessions')
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data).toBeArray()
      expect(json.data.length).toBeGreaterThan(0)
      expect(json.data[0]).toHaveProperty('uid')
      expect(json.data[0]).toHaveProperty('title')
      expect(json.data[0]).toHaveProperty('state')
    })

    it('handles Jellyfin API errors gracefully', async () => {
      await api.settings.set('jellyfin_url', 'http://jellyfin.local')
      await api.settings.set('jellyfin_api_key', 'test-key-123')

      api.http.fetch = mock(async () => new Response('Not Found', { status: 404 }))

      const req = new Request('http://localhost/sessions')
      const res = await app.fetch(req)

      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.error.code).toBe('JELLYFIN_ERROR')
    })

    it('filters out sessions without NowPlayingItem', async () => {
      await api.settings.set('jellyfin_url', 'http://jellyfin.local')
      await api.settings.set('jellyfin_api_key', 'test-key-123')

      const mockSessions = [
        {
          Id: 'session-1',
          UserName: 'testuser',
          Client: 'Web',
        },
        {
          Id: 'session-2',
          UserName: 'testuser2',
          Client: 'App',
          NowPlayingItem: {
            Id: 'item-1',
            ServerId: 'server-1',
            Name: 'Test Show',
            Type: 'Episode',
            SeriesName: 'Test Series',
            RunTimeTicks: 24000000000,
          },
          PlayState: { IsPaused: false },
        },
      ]

      api.http.fetch = mock(async () => new Response(JSON.stringify(mockSessions), { status: 200 }))

      const req = new Request('http://localhost/sessions')
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data).toBeArray()
      expect(json.data.length).toBe(1)
      expect(json.data[0].title).toBe('Test Series')
    })
  })

  describe('GET /latest', () => {
    it('returns 422 when configuration is missing', async () => {
      const req = new Request('http://localhost/latest')
      const res = await app.fetch(req)

      expect(res.status).toBe(422)
      const json = await res.json()
      expect(json.error.code).toBe('CONFIG_MISSING')
    })

    it('returns latest items successfully', async () => {
      await api.settings.set('jellyfin_url', 'http://jellyfin.local')
      await api.settings.set('jellyfin_api_key', 'test-key-123')
      await api.settings.set('recent_limit', '10')

      const mockUsers = [{ Id: 'user-1', Policy: { IsAdministrator: true } }]
      const mockItems = [
        {
          Id: 'item-1',
          ServerId: 'server-1',
          Name: 'New Movie',
          Type: 'Movie',
          ProductionYear: 2024,
          RunTimeTicks: 72000000000,
        },
      ]

      let callCount = 0
      api.http.fetch = mock(async () => {
        callCount++
        if (callCount === 1) {
          return new Response(JSON.stringify(mockUsers), { status: 200 })
        }
        return new Response(JSON.stringify(mockItems), { status: 200 })
      })

      const req = new Request('http://localhost/latest')
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data).toBeArray()
      expect(json.data.length).toBeGreaterThan(0)
      expect(json.data[0]).toHaveProperty('uid')
      expect(json.data[0]).toHaveProperty('title')
      expect(json.data[0]).toHaveProperty('type')
    })

    it('returns error when no users found', async () => {
      await api.settings.set('jellyfin_url', 'http://jellyfin.local')
      await api.settings.set('jellyfin_api_key', 'test-key-123')

      api.http.fetch = mock(async () => new Response(JSON.stringify([]), { status: 200 }))

      const req = new Request('http://localhost/latest')
      const res = await app.fetch(req)

      expect(res.status).toBe(500)
      const json = await res.json()
      expect(json.error.code).toBe('NO_USERS')
    })
  })

  describe('GET /items/:id', () => {
    it('returns 422 when configuration is missing', async () => {
      const req = new Request('http://localhost/items/test-id')
      const res = await app.fetch(req)

      expect(res.status).toBe(422)
      const json = await res.json()
      expect(json.error.code).toBe('CONFIG_MISSING')
    })

    it('returns item details successfully', async () => {
      await api.settings.set('jellyfin_url', 'http://jellyfin.local')
      await api.settings.set('jellyfin_api_key', 'test-key-123')

      const mockUsers = [{ Id: 'user-1', Policy: { IsAdministrator: true } }]
      const mockItem = {
        Id: 'item-1',
        ServerId: 'server-1',
        Name: 'Test Movie',
        Type: 'Movie',
        ProductionYear: 2024,
        Overview: 'A test movie',
        CommunityRating: 8.5,
        RunTimeTicks: 72000000000,
      }

      let callCount = 0
      api.http.fetch = mock(async () => {
        callCount++
        if (callCount === 1) {
          return new Response(JSON.stringify(mockUsers), { status: 200 })
        }
        return new Response(JSON.stringify(mockItem), { status: 200 })
      })

      const req = new Request('http://localhost/items/item-1')
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data).toHaveProperty('uid', 'item-1')
      expect(json.data).toHaveProperty('title', 'Test Movie')
      expect(json.data).toHaveProperty('type', 'movie')
      expect(json.data).toHaveProperty('rating', 8.5)
    })

    it('returns 404 when item not found', async () => {
      await api.settings.set('jellyfin_url', 'http://jellyfin.local')
      await api.settings.set('jellyfin_api_key', 'test-key-123')

      const mockUsers = [{ Id: 'user-1', Policy: { IsAdministrator: true } }]

      let callCount = 0
      api.http.fetch = mock(async () => {
        callCount++
        if (callCount === 1) {
          return new Response(JSON.stringify(mockUsers), { status: 200 })
        }
        return new Response('Not Found', { status: 404 })
      })

      const req = new Request('http://localhost/items/nonexistent')
      const res = await app.fetch(req)

      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.error.code).toBe('JELLYFIN_ERROR')
    })
  })
})
