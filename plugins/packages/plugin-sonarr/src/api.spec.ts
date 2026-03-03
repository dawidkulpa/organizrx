import { describe, test, expect, mock } from 'bun:test'
import { createSonarrAPI } from './api'
import type { PluginAPI, PluginSettings, PluginLogger, PluginHTTP } from '@organizrx/plugin-sdk'
import type { SonarrCalendarEpisode, SonarrQueue, SonarrSeries } from './types'

// Mock data
const mockCalendarEpisode: SonarrCalendarEpisode = {
  seriesId: 1,
  episodeFileId: 123,
  seasonNumber: 1,
  episodeNumber: 5,
  title: 'Test Episode',
  airDate: '2026-03-10',
  airDateUtc: '2026-03-10T20:00:00Z',
  overview: 'Test overview',
  hasFile: false,
  monitored: true,
  unverifiedSceneNumbering: false,
  id: 456,
  series: {
    title: 'Test Series',
    sortTitle: 'test series',
    seasonCount: 2,
    status: 'continuing',
    overview: 'Test series overview',
    images: [],
    seasons: [],
    path: '/tv/test-series',
    profileId: 1,
    seasonFolder: true,
    monitored: true,
    useSceneNumbering: false,
    runtime: 45,
    tvdbId: 12345,
    seriesType: 'standard',
    cleanTitle: 'testseries',
    titleSlug: 'test-series',
    genres: ['Drama'],
    tags: [],
    added: '2026-01-01T00:00:00Z',
    ratings: { votes: 100, value: 8.5 },
    qualityProfileId: 1,
    id: 1,
  },
}

const mockQueueRecord = {
  seriesId: 1,
  episodeId: 456,
  series: mockCalendarEpisode.series,
  episode: {
    seriesId: 1,
    episodeFileId: 0,
    seasonNumber: 1,
    episodeNumber: 5,
    title: 'Test Episode',
    airDate: '2026-03-10',
    airDateUtc: '2026-03-10T20:00:00Z',
    hasFile: false,
    monitored: true,
    id: 456,
  },
  quality: {
    quality: {
      id: 1,
      name: '1080p',
    },
    revision: {
      version: 1,
      real: 0,
    },
  },
  size: 1073741824,
  title: 'Test.Series.S01E05.1080p',
  sizeleft: 536870912,
  timeleft: '00:15:30',
  estimatedCompletionTime: '2026-03-10T21:00:00Z',
  status: 'downloading',
  protocol: 'torrent' as const,
  id: 789,
}

const mockQueue: SonarrQueue = {
  page: 1,
  pageSize: 100,
  sortKey: 'timeleft',
  sortDirection: 'ascending',
  totalRecords: 1,
  records: [mockQueueRecord],
}

const mockSeries: SonarrSeries = mockCalendarEpisode.series

// Helper to create mock PluginAPI
function createMockAPI(
  fetchResponse: unknown = [],
  fetchOk: boolean = true,
  fetchStatus: number = 200
): PluginAPI {
  const settingsMap = new Map<string, string>([
    ['sonarr_url', 'http://localhost:8989'],
    ['sonarr_api_key', 'test-api-key'],
    ['sonarr_base_path', ''],
  ])

  const mockSettings: PluginSettings = {
    get: mock(async (key: string) => settingsMap.get(key) || null),
    getNumber: mock(async (key: string, defaultValue?: number) => {
      const val = settingsMap.get(key)
      return val ? parseInt(val, 10) : defaultValue || 0
    }),
    getBoolean: mock(async (key: string, defaultValue?: boolean) => {
      const val = settingsMap.get(key)
      return val === 'true' ? true : defaultValue || false
    }),
    getJSON: mock(async <T>(key: string, defaultValue?: T) => {
      const val = settingsMap.get(key)
      return val ? JSON.parse(val) : defaultValue
    }),
    set: mock(async () => {}),
  }

  const mockLogger: PluginLogger = {
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    debug: mock(() => {}),
  }

  const mockHTTP: PluginHTTP = {
    fetch: mock(async () => {
      return new Response(JSON.stringify(fetchResponse), {
        status: fetchStatus,
        statusText: fetchOk ? 'OK' : 'Error',
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

describe('Sonarr API Routes', () => {
  describe('GET /calendar', () => {
    test('should return calendar episodes successfully', async () => {
      const api = createMockAPI([mockCalendarEpisode])
      const app = createSonarrAPI(api)

      const res = await app.request('/calendar')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json).toHaveProperty('data')
      expect(Array.isArray(json.data)).toBe(true)
      expect(json.data[0]).toMatchObject({
        title: 'Test Episode',
        seriesId: 1,
      })
    })

    test('should handle query parameters', async () => {
      const api = createMockAPI([mockCalendarEpisode])
      const app = createSonarrAPI(api)

      const res = await app.request('/calendar?start=2026-03-01&end=2026-03-31&unmonitored=true')
      expect(res.status).toBe(200)

      expect(api.http.fetch).toHaveBeenCalled()
      const fetchCall = (api.http.fetch as ReturnType<typeof mock>).mock.calls[0]
      const url = fetchCall[0] as string
      expect(url).toContain('start=2026-03-01')
      expect(url).toContain('end=2026-03-31')
      expect(url).toContain('includeUnmonitored=true')
    })

    test('should return error when Sonarr URL is not configured', async () => {
      const api = createMockAPI()
      ;(api.settings.get as ReturnType<typeof mock>).mockImplementation(async (key: string) => {
        if (key === 'sonarr_url') return null
        if (key === 'sonarr_api_key') return 'test-key'
        return null
      })

      const app = createSonarrAPI(api)
      const res = await app.request('/calendar')

      expect(res.status).toBe(422)
      const json = await res.json()
      expect(json).toHaveProperty('error')
      expect(json.error.message).toContain('Sonarr URL is not configured')
    })

    test('should return error when Sonarr API key is not configured', async () => {
      const api = createMockAPI()
      ;(api.settings.get as ReturnType<typeof mock>).mockImplementation(async (key: string) => {
        if (key === 'sonarr_url') return 'http://localhost:8989'
        if (key === 'sonarr_api_key') return null
        return null
      })

      const app = createSonarrAPI(api)
      const res = await app.request('/calendar')

      expect(res.status).toBe(422)
      const json = await res.json()
      expect(json).toHaveProperty('error')
      expect(json.error.message).toContain('Sonarr API key is not configured')
    })

    test('should handle Sonarr API errors', async () => {
      const api = createMockAPI({ message: 'Unauthorized' }, false, 401)
      const app = createSonarrAPI(api)

      const res = await app.request('/calendar')

      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json).toHaveProperty('error')
      expect(json.error.code).toBe('SONARR_API_ERROR')
    })
  })

  describe('GET /queue', () => {
    test('should return queue items successfully', async () => {
      const api = createMockAPI(mockQueue)
      const app = createSonarrAPI(api)

      const res = await app.request('/queue')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json).toHaveProperty('data')
      expect(json.data).toHaveProperty('records')
      expect(Array.isArray(json.data.records)).toBe(true)
      expect(json.data.records[0]).toMatchObject({
        title: 'Test.Series.S01E05.1080p',
        status: 'downloading',
      })
    })

    test('should include X-Api-Key header', async () => {
      const api = createMockAPI(mockQueue)
      const app = createSonarrAPI(api)

      await app.request('/queue')

      expect(api.http.fetch).toHaveBeenCalled()
      const fetchCall = (api.http.fetch as ReturnType<typeof mock>).mock.calls[0]
      const options = fetchCall[1] as RequestInit
      expect(options.headers).toHaveProperty('X-Api-Key', 'test-api-key')
    })

    test('should handle empty queue', async () => {
      const emptyQueue = { ...mockQueue, totalRecords: 0, records: [] }
      const api = createMockAPI(emptyQueue)
      const app = createSonarrAPI(api)

      const res = await app.request('/queue')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.data.records).toHaveLength(0)
    })
  })

  describe('GET /series/:id', () => {
    test('should return series details successfully', async () => {
      const api = createMockAPI(mockSeries)
      const app = createSonarrAPI(api)

      const res = await app.request('/series/1')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json).toHaveProperty('data')
      expect(json.data).toMatchObject({
        title: 'Test Series',
        id: 1,
      })
    })

    test('should validate series ID parameter', async () => {
      const api = createMockAPI(mockSeries)
      const app = createSonarrAPI(api)

      const res = await app.request('/series/abc')
      expect(res.status).toBe(400)
    })

    test('should handle series not found', async () => {
      const api = createMockAPI({ message: 'NotFound' }, false, 404)
      const app = createSonarrAPI(api)

      const res = await app.request('/series/999')
      expect(res.status).toBe(404)

      const json = await res.json()
      expect(json).toHaveProperty('error')
      expect(json.error.code).toBe('SONARR_API_ERROR')
    })
  })

  describe('Configuration and Authentication', () => {
    test('should use base path when configured', async () => {
      const api = createMockAPI([mockCalendarEpisode])
      ;(api.settings.get as ReturnType<typeof mock>).mockImplementation(async (key: string) => {
        if (key === 'sonarr_url') return 'http://localhost:8989'
        if (key === 'sonarr_api_key') return 'test-key'
        if (key === 'sonarr_base_path') return '/sonarr'
        return null
      })

      const app = createSonarrAPI(api)
      await app.request('/calendar')

      expect(api.http.fetch).toHaveBeenCalled()
      const fetchCall = (api.http.fetch as ReturnType<typeof mock>).mock.calls[0]
      const url = fetchCall[0] as string
      expect(url).toContain('/sonarr/api/v3/calendar')
    })

    test('should handle trailing slashes in URL', async () => {
      const api = createMockAPI([mockCalendarEpisode])
      ;(api.settings.get as ReturnType<typeof mock>).mockImplementation(async (key: string) => {
        if (key === 'sonarr_url') return 'http://localhost:8989/'
        if (key === 'sonarr_api_key') return 'test-key'
        return null
      })

      const app = createSonarrAPI(api)
      await app.request('/calendar')

      expect(api.http.fetch).toHaveBeenCalled()
      const fetchCall = (api.http.fetch as ReturnType<typeof mock>).mock.calls[0]
      const url = fetchCall[0] as string
      expect(url).not.toContain('//api')
    })
  })
})
