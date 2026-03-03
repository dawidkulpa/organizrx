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

const mockQueueGroups = [
  {
    NZBID: 123,
    NZBName: 'test.file.mkv',
    RemainingSizeMB: 256,
    FileSizeMB: 512,
    Status: 'DOWNLOADING',
    MinPostTime: 0,
    MaxPostTime: 0,
    Category: 'movies',
    DownloadedSizeMB: 256,
    DownloadRate: 5242880,
    FileCount: 50,
    RemainingFileCount: 25,
  },
  {
    NZBID: 456,
    NZBName: 'another.file.mkv',
    RemainingSizeMB: 512,
    FileSizeMB: 512,
    Status: 'PAUSED',
    MinPostTime: 0,
    MaxPostTime: 0,
    Category: 'tv',
    DownloadedSizeMB: 0,
    DownloadRate: 0,
    FileCount: 30,
    RemainingFileCount: 30,
  },
]

const mockHistoryItems = [
  {
    NZBID: 789,
    Name: 'completed.file.mkv',
    Category: 'movies',
    Status: 'SUCCESS/ALL',
    DownloadedSizeMB: 1024,
    DownloadTimeSec: 300,
    HistoryTime: 1646092800,
    FileSizeMB: 1024,
    ParStatus: 'SUCCESS',
    UnpackStatus: 'SUCCESS',
    DeleteStatus: 'NONE',
    ScriptStatus: 'NONE',
    FailedArticles: 0,
  },
]

const mockJsonRpcQueueResponse = {
  version: '1.1',
  result: mockQueueGroups,
}

const mockJsonRpcHistoryResponse = {
  version: '1.1',
  result: mockHistoryItems,
}

const mockJsonRpcBooleanResponse = {
  version: '1.1',
  result: true,
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NZBGet Plugin API', () => {
  describe('Configuration Validation', () => {
    it('should return 422 when URL is missing', async () => {
      const api = createMockAPI({})
      const app = createApiRoutes(api)

      const req = new Request('http://localhost/queue')
      const res = await app.fetch(req)

      expect(res.status).toBe(422)
      const body = await res.json()
      expect(body.error.code).toBe('MISSING_CONFIG')
    })

    it('should allow empty username and password', async () => {
      const fetchMock = mock(
        async () =>
          new Response(JSON.stringify(mockJsonRpcQueueResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
      )

      const api = createMockAPI(
        {
          nzbget_url: 'http://localhost:6789',
        },
        fetchMock
      )

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/queue')
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
    })
  })

  describe('JSON-RPC Request Formatting', () => {
    it('should format JSON-RPC requests correctly', async () => {
      const fetchMock = mock(async (url: string, options?: RequestInit) => {
        expect(url).toContain('/jsonrpc')

        const body = JSON.parse(options?.body as string)
        expect(body).toHaveProperty('method')
        expect(body).toHaveProperty('params')
        expect(Array.isArray(body.params)).toBe(true)

        return new Response(JSON.stringify(mockJsonRpcQueueResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const api = createMockAPI(
        {
          nzbget_url: 'http://localhost:6789',
          nzbget_username: 'test',
          nzbget_password: 'pass',
        },
        fetchMock
      )

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/queue')
      await app.fetch(req)

      expect(fetchMock).toHaveBeenCalled()
    })

    it('should include HTTP Basic auth header', async () => {
      const fetchMock = mock(async (url: string, options?: RequestInit) => {
        const authHeader = options?.headers?.['Authorization'] as string
        expect(authHeader).toBeDefined()
        expect(authHeader).toContain('Basic ')

        return new Response(JSON.stringify(mockJsonRpcQueueResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const api = createMockAPI(
        {
          nzbget_url: 'http://localhost:6789',
          nzbget_username: 'testuser',
          nzbget_password: 'testpass',
        },
        fetchMock
      )

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/queue')
      await app.fetch(req)

      expect(fetchMock).toHaveBeenCalled()
    })
  })

  describe('GET /queue', () => {
    it('should fetch queue data successfully', async () => {
      const fetchMock = mock(
        async () =>
          new Response(JSON.stringify(mockJsonRpcQueueResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
      )

      const api = createMockAPI(
        {
          nzbget_url: 'http://localhost:6789',
          nzbget_username: 'test',
          nzbget_password: 'pass',
        },
        fetchMock
      )

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/queue')
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.groups).toHaveLength(2)
      expect(body.data.totalSizeMB).toBe(1024)
      expect(body.data.remainingSizeMB).toBe(768)
      expect(body.data.activeCount).toBe(2)
    })

    it('should return error when NZBGet API fails', async () => {
      const fetchMock = mock(async () => new Response('Internal Server Error', { status: 500 }))

      const api = createMockAPI(
        {
          nzbget_url: 'http://localhost:6789',
          nzbget_username: 'test',
          nzbget_password: 'pass',
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
          new Response(JSON.stringify(mockJsonRpcHistoryResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
      )

      const api = createMockAPI(
        {
          nzbget_url: 'http://localhost:6789',
          nzbget_username: 'test',
          nzbget_password: 'pass',
        },
        fetchMock
      )

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/history')
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.items).toHaveLength(1)
      expect(body.data.items[0].Status).toBe('SUCCESS/ALL')
      expect(body.data.totalCount).toBe(1)
    })
  })

  describe('POST /pause', () => {
    it('should pause download successfully', async () => {
      const fetchMock = mock(async (url: string, options?: RequestInit) => {
        const body = JSON.parse(options?.body as string)
        expect(body.method).toBe('pausedownload')
        expect(body.params).toEqual([123])

        return new Response(JSON.stringify(mockJsonRpcBooleanResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const api = createMockAPI(
        {
          nzbget_url: 'http://localhost:6789',
          nzbget_username: 'test',
          nzbget_password: 'pass',
        },
        fetchMock
      )

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/pause', {
        method: 'POST',
        body: JSON.stringify({ nzbId: 123 }),
      })
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.success).toBe(true)
    })

    it('should return 400 when nzbId is missing', async () => {
      const api = createMockAPI({
        nzbget_url: 'http://localhost:6789',
        nzbget_username: 'test',
        nzbget_password: 'pass',
      })

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/pause', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const res = await app.fetch(req)

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error.code).toBe('INVALID_REQUEST')
    })
  })

  describe('POST /resume', () => {
    it('should resume download successfully', async () => {
      const fetchMock = mock(async (url: string, options?: RequestInit) => {
        const body = JSON.parse(options?.body as string)
        expect(body.method).toBe('resumedownload')
        expect(body.params).toEqual([456])

        return new Response(JSON.stringify(mockJsonRpcBooleanResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const api = createMockAPI(
        {
          nzbget_url: 'http://localhost:6789',
          nzbget_username: 'test',
          nzbget_password: 'pass',
        },
        fetchMock
      )

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/resume', {
        method: 'POST',
        body: JSON.stringify({ nzbId: 456 }),
      })
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.success).toBe(true)
    })

    it('should return 400 when nzbId is missing', async () => {
      const api = createMockAPI({
        nzbget_url: 'http://localhost:6789',
        nzbget_username: 'test',
        nzbget_password: 'pass',
      })

      const app = createApiRoutes(api)
      const req = new Request('http://localhost/resume', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const res = await app.fetch(req)

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error.code).toBe('INVALID_REQUEST')
    })
  })

  describe('Error Handling', () => {
    it('should handle JSON parsing errors', async () => {
      const fetchMock = mock(
        async () =>
          new Response('Invalid JSON', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
      )

      const api = createMockAPI(
        {
          nzbget_url: 'http://localhost:6789',
          nzbget_username: 'test',
          nzbget_password: 'pass',
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

    it('should handle network errors', async () => {
      const fetchMock = mock(async () => {
        throw new Error('Network error')
      })

      const api = createMockAPI(
        {
          nzbget_url: 'http://localhost:6789',
          nzbget_username: 'test',
          nzbget_password: 'pass',
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
})
