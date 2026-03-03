import { describe, it, expect, beforeEach, mock } from 'bun:test'
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

const mockQueueResponse = {
  queue: {
    status: 'Downloading',
    paused: false,
    speed: '5.2 M',
    speedlimit: '',
    speedlimit_abs: '',
    kbpersec: '5324.8',
    mb: '1024.00',
    mbleft: '512.00',
    sizeleft: '512.00 MB',
    noofslots: 2,
    slots: [
      {
        nzo_id: 'SABnzbd_nzo_123',
        filename: 'test.file.mkv',
        mb: '512.00',
        mbleft: '256.00',
        size: '512.00 MB',
        sizeleft: '256.00 MB',
        percentage: '50',
        status: 'Downloading',
        timeleft: '0:05:00',
        eta: '14:30:00',
        priority: 'Normal',
        category: 'movies',
      },
      {
        nzo_id: 'SABnzbd_nzo_456',
        filename: 'another.file.mkv',
        mb: '512.00',
        mbleft: '256.00',
        size: '512.00 MB',
        sizeleft: '256.00 MB',
        percentage: '50',
        status: 'Paused',
        timeleft: '0:05:00',
        eta: '14:30:00',
        priority: 'Normal',
        category: 'tv',
      },
    ],
    timeleft: '0:10:00',
    eta: '14:35:00',
  },
}

const mockHistoryResponse = {
  history: {
    total_size: '1024.00 MB',
    slots: [
      {
        nzo_id: 'SABnzbd_nzo_789',
        name: 'completed.file.mkv',
        size: '1024.00 MB',
        category: 'movies',
        status: 'Completed',
        fail_message: '',
        completed: 1646092800,
        download_time: 300,
        storage: '/downloads/completed.file.mkv',
        bytes: 1073741824,
      },
    ],
  },
}

const mockActionResponse = {
  status: true,
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SABnzbd Plugin API', () => {
  describe('Configuration Validation', () => {
    it('should return 422 when settings are missing', async () => {
      const api = createMockAPI({})
      const app = createApiRoutes(api)

      const req = new Request('http://localhost/queue')
      const res = await app.fetch(req)

      expect(res.status).toBe(422)
      const body = await res.json()
      expect(body.error.code).toBe('MISSING_CONFIG')
    })

    it('should return 422 when only URL is configured', async () => {
      const api = createMockAPI({ sabnzbd_url: 'http://localhost:8080' })
      const app = createApiRoutes(api)

      const req = new Request('http://localhost/queue')
      const res = await app.fetch(req)

      expect(res.status).toBe(422)
      const body = await res.json()
      expect(body.error.code).toBe('MISSING_CONFIG')
    })

    it('should return 422 when only API key is configured', async () => {
      const api = createMockAPI({ sabnzbd_api_key: 'test-key' })
      const app = createApiRoutes(api)

      const req = new Request('http://localhost/queue')
      const res = await app.fetch(req)

      expect(res.status).toBe(422)
      const body = await res.json()
      expect(body.error.code).toBe('MISSING_CONFIG')
    })
  })

  describe('GET /queue', () => {
    it('should fetch queue data successfully', async () => {
      const fetchMock = mock(
        async () =>
          new Response(JSON.stringify(mockQueueResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
      )

      const api = createMockAPI(
        {
          sabnzbd_url: 'http://localhost:8080',
          sabnzbd_api_key: 'test-key',
        },
        fetchMock
      )

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/queue')
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.queue.noofslots).toBe(2)
      expect(body.data.queue.slots).toHaveLength(2)
    })

    it('should return error when SABnzbd API fails', async () => {
      const fetchMock = mock(async () => new Response('Internal Server Error', { status: 500 }))

      const api = createMockAPI(
        {
          sabnzbd_url: 'http://localhost:8080',
          sabnzbd_api_key: 'test-key',
        },
        fetchMock
      )

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/queue')
      const res = await app.fetch(req)

      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error.code).toBe('FETCH_ERROR')
    })
  })

  describe('GET /history', () => {
    it('should fetch history data successfully', async () => {
      const fetchMock = mock(
        async () =>
          new Response(JSON.stringify(mockHistoryResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
      )

      const api = createMockAPI(
        {
          sabnzbd_url: 'http://localhost:8080',
          sabnzbd_api_key: 'test-key',
        },
        fetchMock
      )

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/history')
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.history.slots).toHaveLength(1)
      expect(body.data.history.slots[0].status).toBe('Completed')
    })

    it('should respect limit query parameter', async () => {
      const fetchMock = mock(async (url: string) => {
        const urlObj = new URL(url)
        expect(urlObj.searchParams.get('limit')).toBe('50')
        return new Response(JSON.stringify(mockHistoryResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const api = createMockAPI(
        {
          sabnzbd_url: 'http://localhost:8080',
          sabnzbd_api_key: 'test-key',
        },
        fetchMock
      )

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/history?limit=50')
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
    })
  })

  describe('POST /pause', () => {
    it('should pause queue successfully', async () => {
      const fetchMock = mock(async (url: string) => {
        const urlObj = new URL(url)
        expect(urlObj.searchParams.get('mode')).toBe('pause')
        return new Response(JSON.stringify(mockActionResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const api = createMockAPI(
        {
          sabnzbd_url: 'http://localhost:8080',
          sabnzbd_api_key: 'test-key',
        },
        fetchMock
      )

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/pause', { method: 'POST' })
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.status).toBe(true)
    })
  })

  describe('POST /resume', () => {
    it('should resume queue successfully', async () => {
      const fetchMock = mock(async (url: string) => {
        const urlObj = new URL(url)
        expect(urlObj.searchParams.get('mode')).toBe('resume')
        return new Response(JSON.stringify(mockActionResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const api = createMockAPI(
        {
          sabnzbd_url: 'http://localhost:8080',
          sabnzbd_api_key: 'test-key',
        },
        fetchMock
      )

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/resume', { method: 'POST' })
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.status).toBe(true)
    })
  })

  describe('POST /pause/:id', () => {
    it('should pause specific item successfully', async () => {
      const fetchMock = mock(async (url: string) => {
        const urlObj = new URL(url)
        expect(urlObj.searchParams.get('mode')).toBe('queue')
        expect(urlObj.searchParams.get('name')).toBe('pause')
        expect(urlObj.searchParams.get('value')).toBe('SABnzbd_nzo_123')
        return new Response(JSON.stringify(mockActionResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const api = createMockAPI(
        {
          sabnzbd_url: 'http://localhost:8080',
          sabnzbd_api_key: 'test-key',
        },
        fetchMock
      )

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/pause/SABnzbd_nzo_123', { method: 'POST' })
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.status).toBe(true)
    })
  })

  describe('POST /resume/:id', () => {
    it('should resume specific item successfully', async () => {
      const fetchMock = mock(async (url: string) => {
        const urlObj = new URL(url)
        expect(urlObj.searchParams.get('mode')).toBe('queue')
        expect(urlObj.searchParams.get('name')).toBe('resume')
        expect(urlObj.searchParams.get('value')).toBe('SABnzbd_nzo_456')
        return new Response(JSON.stringify(mockActionResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const api = createMockAPI(
        {
          sabnzbd_url: 'http://localhost:8080',
          sabnzbd_api_key: 'test-key',
        },
        fetchMock
      )

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/resume/SABnzbd_nzo_456', { method: 'POST' })
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.status).toBe(true)
    })
  })
})
