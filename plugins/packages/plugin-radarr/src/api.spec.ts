import { describe, it, expect, mock, beforeEach } from 'bun:test'
import type { PluginAPI, PluginSettings, PluginLogger, PluginHTTP } from '@organizrx/plugin-sdk'
import { createRadarrAPI } from './api'
import type { RadarrCalendarItem, RadarrQueueResponse, RadarrMovie } from './types'

// Mock data
const mockCalendarItem: RadarrCalendarItem = {
  id: 1,
  title: 'Test Movie',
  originalTitle: 'Test Movie',
  sortTitle: 'test movie',
  status: 'released',
  overview: 'A test movie',
  inCinemas: '2024-01-01',
  physicalRelease: '2024-02-01',
  digitalRelease: '2024-01-15',
  images: [{ coverType: 'poster', url: 'https://example.com/poster.jpg' }],
  year: 2024,
  hasFile: true,
  path: '/movies/test-movie',
  qualityProfileId: 1,
  monitored: true,
  minimumAvailability: 'released',
  isAvailable: true,
  runtime: 120,
  cleanTitle: 'testmovie',
  tmdbId: 12345,
  titleSlug: 'test-movie',
  genres: ['Action', 'Drama'],
  added: '2023-12-01',
  ratings: {
    imdb: { votes: 1000, value: 8.5, type: 'user' },
    value: 8.5,
  },
  movieFile: {
    id: 1,
    movieId: 1,
    relativePath: 'Test Movie (2024).mkv',
    path: '/movies/test-movie/Test Movie (2024).mkv',
    size: 5000000000,
    dateAdded: '2024-02-01',
    quality: {
      quality: { id: 7, name: '1080p', resolution: 1080 },
      revision: { version: 1, real: 0, isRepack: false },
    },
    mediaInfo: {
      audioChannels: '5.1',
      audioCodec: 'DTS',
      videoCodec: 'h264',
    },
  },
}

const mockQueueResponse: RadarrQueueResponse = {
  page: 1,
  pageSize: 20,
  sortKey: 'timeleft',
  sortDirection: 'ascending',
  totalRecords: 1,
  records: [
    {
      id: 1,
      movieId: 1,
      quality: {
        quality: { id: 7, name: '1080p', resolution: 1080 },
        revision: { version: 1, real: 0, isRepack: false },
      },
      size: 5000000000,
      title: 'Test Movie (2024) 1080p',
      sizeleft: 2500000000,
      timeleft: '00:15:30',
      status: 'downloading',
      protocol: 'torrent',
    },
  ],
}

const mockMovie: RadarrMovie = mockCalendarItem

// Create mock PluginAPI
function createMockPluginAPI(
  settingsData: Record<string, string | boolean | number> = {}
): PluginAPI {
  const mockSettings: PluginSettings = {
    get: mock(async (key: string) => {
      const value = settingsData[key]
      return typeof value === 'string' ? value : null
    }),
    getNumber: mock(async (key: string, defaultValue?: number) => {
      const value = settingsData[key]
      return typeof value === 'number' ? value : (defaultValue ?? 0)
    }),
    getBoolean: mock(async (key: string, defaultValue?: boolean) => {
      const value = settingsData[key]
      return typeof value === 'boolean' ? value : (defaultValue ?? false)
    }),
    getJSON: mock(async <T>(key: string, defaultValue?: T) => {
      const value = settingsData[key]
      return value !== undefined ? (value as T) : (defaultValue as T)
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
    fetch: mock(async (url: string) => {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname

      if (pathname.includes('/calendar')) {
        return new Response(JSON.stringify([mockCalendarItem]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (pathname.includes('/queue')) {
        return new Response(JSON.stringify(mockQueueResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (pathname.includes('/movie')) {
        return new Response(JSON.stringify([mockMovie]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response('Not Found', { status: 404 })
    }),
  }

  return {
    settings: mockSettings,
    logger: mockLogger,
    http: mockHTTP,
  }
}

describe('Radarr API', () => {
  let mockAPI: PluginAPI

  beforeEach(() => {
    mockAPI = createMockPluginAPI({
      radarr_url: 'https://radarr.example.com',
      radarr_api_key: 'test-api-key',
      radarr_show_unmonitored: false,
      radarr_show_physical_release: true,
      radarr_show_digital_release: true,
      radarr_show_cinema_release: true,
    })
  })

  describe('GET /calendar', () => {
    it('should fetch calendar data successfully', async () => {
      const app = createRadarrAPI(mockAPI)
      const req = new Request('http://localhost/calendar')
      const res = await app.request(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json).toHaveProperty('data')
      expect(Array.isArray(json.data)).toBe(true)
      expect(json.data.length).toBeGreaterThan(0)
      expect(json.data[0]).toHaveProperty('title')
    })

    it('should handle missing settings', async () => {
      const emptyAPI = createMockPluginAPI({})
      const app = createRadarrAPI(emptyAPI)
      const req = new Request('http://localhost/calendar')
      const res = await app.request(req)
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json).toHaveProperty('error')
      expect(json.error).toHaveProperty('code')
    })

    it('should accept start and end query parameters', async () => {
      const app = createRadarrAPI(mockAPI)
      const req = new Request('http://localhost/calendar?start=2024-01-01&end=2024-12-31')
      const res = await app.request(req)

      expect(res.status).toBe(200)
      expect(mockAPI.http.fetch).toHaveBeenCalled()
    })
  })

  describe('GET /queue', () => {
    it('should fetch queue data successfully', async () => {
      const app = createRadarrAPI(mockAPI)
      const req = new Request('http://localhost/queue')
      const res = await app.request(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json).toHaveProperty('data')
      expect(json.data).toHaveProperty('records')
      expect(Array.isArray(json.data.records)).toBe(true)
    })

    it('should handle API errors gracefully', async () => {
      const failAPI = createMockPluginAPI({
        radarr_url: 'https://radarr.example.com',
        radarr_api_key: 'test-api-key',
      })
      failAPI.http.fetch = mock(async () => {
        return new Response('Unauthorized', { status: 401 })
      })

      const app = createRadarrAPI(failAPI)
      const req = new Request('http://localhost/queue')
      const res = await app.request(req)
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json).toHaveProperty('error')
    })
  })

  describe('GET /movie/:id', () => {
    it('should fetch movie by TMDB ID successfully', async () => {
      const app = createRadarrAPI(mockAPI)
      const req = new Request('http://localhost/movie/12345')
      const res = await app.request(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json).toHaveProperty('data')
      expect(json.data).toHaveProperty('title')
      expect(json.data.tmdbId).toBe(12345)
    })

    it('should return 404 for non-existent movie', async () => {
      const app = createRadarrAPI(mockAPI)
      const req = new Request('http://localhost/movie/99999')
      const res = await app.request(req)
      const json = await res.json()

      expect(res.status).toBe(404)
      expect(json).toHaveProperty('error')
      expect(json.error.code).toBe('NOT_FOUND')
    })

    it('should validate ID parameter', async () => {
      const app = createRadarrAPI(mockAPI)
      const req = new Request('http://localhost/movie/invalid')
      const res = await app.request(req)
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json).toHaveProperty('error')
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })
  })
})
