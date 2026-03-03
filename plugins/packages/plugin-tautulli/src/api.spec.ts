import { describe, it, expect, beforeEach, mock } from 'bun:test'
import type { PluginAPI, PluginSettings, PluginLogger, PluginHTTP } from '@organizrx/plugin-sdk'
import { createTautulliAPI } from './api'

describe('Tautulli API', () => {
  let mockPluginAPI: PluginAPI
  let mockFetch: ReturnType<typeof mock>
  let mockSettings: PluginSettings
  let mockLogger: PluginLogger

  beforeEach(() => {
    mockFetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          response: {
            result: 'success',
            message: null,
            data: {},
          },
        }),
      })
    )

    mockSettings = {
      get: mock(async (key: string) => {
        if (key === 'tautulli_url') {
          return 'http://localhost:8181'
        }
        if (key === 'tautulli_api_key') {
          return 'test-api-key'
        }
        return null
      }),
      getNumber: mock(async () => 0),
      getBoolean: mock(async () => false),
      getJSON: mock(async () => ({})),
      set: mock(async () => {}),
    }

    mockLogger = {
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
      debug: mock(() => {}),
    }

    mockPluginAPI = {
      settings: mockSettings,
      logger: mockLogger,
      http: {
        fetch: mockFetch as unknown as PluginHTTP['fetch'],
      },
    }
  })

  describe('GET /activity', () => {
    it('should fetch activity successfully', async () => {
      const activityData = {
        stream_count: 2,
        stream_count_direct_play: 1,
        stream_count_direct_stream: 0,
        stream_count_transcode: 1,
        total_bandwidth: 5000,
        lan_bandwidth: 3000,
        wan_bandwidth: 2000,
        sessions: [
          {
            session_key: 'session1',
            user: 'testuser',
            friendly_name: 'Test User',
            ip_address: '192.168.1.100',
            player: 'Plex Web',
            product: 'Plex Web',
            platform: 'Chrome',
            title: 'Test Movie',
            year: 2024,
            media_type: 'movie',
            thumb: '/thumb.jpg',
            art: '/art.jpg',
            state: 'playing',
            progress_percent: 45,
            duration: 7200,
            view_offset: 3240,
            transcode_decision: 'transcode',
            video_resolution: '1080p',
            video_full_resolution: '1920x1080',
            video_bitrate: 4000,
            audio_codec: 'aac',
            audio_channels: 2,
            stream_container_decision: 'transcode',
            stream_video_decision: 'transcode',
            stream_audio_decision: 'copy',
            bandwidth: 2500,
            quality_profile: 'Original',
            optimized_version: false,
          },
        ],
      }

      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            response: {
              result: 'success',
              message: null,
              data: activityData,
            },
          }),
        })
      )

      const app = createTautulliAPI(mockPluginAPI)
      const req = new Request('http://localhost/activity')
      const res = await app.fetch(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data).toEqual(activityData)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8181/api/v2?apikey=test-api-key&cmd=get_activity'
      )
    })

    it('should handle missing Tautulli URL', async () => {
      mockSettings.get = mock(async (key: string) => {
        if (key === 'tautulli_api_key') {
          return 'test-api-key'
        }
        return null
      })

      const app = createTautulliAPI(mockPluginAPI)
      const req = new Request('http://localhost/activity')
      const res = await app.fetch(req)
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.error).toBeDefined()
      expect(json.error.code).toBe('TAUTULLI_ACTIVITY_ERROR')
      expect(json.error.message).toContain('Tautulli URL is not configured')
    })

    it('should handle missing API key', async () => {
      mockSettings.get = mock(async (key: string) => {
        if (key === 'tautulli_url') {
          return 'http://localhost:8181'
        }
        return null
      })

      const app = createTautulliAPI(mockPluginAPI)
      const req = new Request('http://localhost/activity')
      const res = await app.fetch(req)
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.error).toBeDefined()
      expect(json.error.code).toBe('TAUTULLI_ACTIVITY_ERROR')
      expect(json.error.message).toContain('Tautulli API key is not configured')
    })

    it('should handle Tautulli API errors', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            response: {
              result: 'error',
              message: 'Invalid API key',
              data: null,
            },
          }),
        })
      )

      const app = createTautulliAPI(mockPluginAPI)
      const req = new Request('http://localhost/activity')
      const res = await app.fetch(req)
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.error).toBeDefined()
      expect(json.error.code).toBe('TAUTULLI_ACTIVITY_ERROR')
      expect(json.error.message).toBe('Invalid API key')
    })

    it('should handle network errors', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
      )

      const app = createTautulliAPI(mockPluginAPI)
      const req = new Request('http://localhost/activity')
      const res = await app.fetch(req)
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.error).toBeDefined()
      expect(json.error.code).toBe('TAUTULLI_ACTIVITY_ERROR')
    })
  })

  describe('GET /history', () => {
    it('should fetch history with default parameters', async () => {
      const historyData = {
        recordsFiltered: 10,
        recordsTotal: 100,
        draw: 1,
        filter_duration: '1h',
        total_duration: '10h',
        data: [
          {
            reference_id: 1,
            row_id: 1,
            id: 1,
            date: 1234567890,
            started: 1234567800,
            stopped: 1234567890,
            duration: 90,
            paused_counter: 0,
            user: 'testuser',
            user_id: 1,
            friendly_name: 'Test User',
            platform: 'Chrome',
            product: 'Plex Web',
            player: 'Plex Web',
            ip_address: '192.168.1.100',
            live: 0,
            machine_id: 'machine1',
            location: 'lan',
            bandwidth: 2500,
            quality_profile: 'Original',
            media_type: 'movie',
            rating_key: '12345',
            parent_rating_key: '',
            grandparent_rating_key: '',
            full_title: 'Test Movie (2024)',
            title: 'Test Movie',
            parent_title: '',
            grandparent_title: '',
            original_title: '',
            year: 2024,
            media_index: 0,
            parent_media_index: 0,
            thumb: '/thumb.jpg',
            originally_available_at: '2024-01-01',
            guid: 'guid123',
            transcode_decision: 'transcode',
            percent_complete: 100,
            watched_status: 1,
            group_count: 1,
            group_ids: '1',
            state: null,
            session_key: null,
          },
        ],
      }

      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            response: {
              result: 'success',
              message: null,
              data: historyData,
            },
          }),
        })
      )

      const app = createTautulliAPI(mockPluginAPI)
      const req = new Request('http://localhost/history')
      const res = await app.fetch(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data).toEqual(historyData)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8181/api/v2?apikey=test-api-key&cmd=get_history&length=10&start=0&order_column=date&order_dir=desc'
      )
    })

    it('should fetch history with custom parameters', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            response: {
              result: 'success',
              message: null,
              data: { recordsFiltered: 0, recordsTotal: 100, draw: 1, data: [] },
            },
          }),
        })
      )

      const app = createTautulliAPI(mockPluginAPI)
      const req = new Request('http://localhost/history?length=25&start=10')
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8181/api/v2?apikey=test-api-key&cmd=get_history&length=25&start=10&order_column=date&order_dir=desc'
      )
    })
  })

  describe('GET /users', () => {
    it('should fetch users successfully', async () => {
      const usersData = {
        data: [
          {
            user_id: 1,
            username: 'testuser',
            friendly_name: 'Test User',
            email: 'test@example.com',
            thumb: '/thumb.jpg',
            is_admin: 0,
            is_home_user: 1,
            is_allow_sync: 1,
            is_restricted: 0,
            do_notify: 1,
            keep_history: 1,
            allow_guest: 0,
            deleted_user: 0,
            shared_libraries: ['Movies', 'TV Shows'],
            filter_all: '',
            filter_movies: '',
            filter_tv: '',
            filter_music: '',
            filter_photos: '',
          },
        ],
      }

      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            response: {
              result: 'success',
              message: null,
              data: usersData,
            },
          }),
        })
      )

      const app = createTautulliAPI(mockPluginAPI)
      const req = new Request('http://localhost/users')
      const res = await app.fetch(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data).toEqual(usersData)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8181/api/v2?apikey=test-api-key&cmd=get_users_table'
      )
    })

    it('should handle errors when fetching users', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
        })
      )

      const app = createTautulliAPI(mockPluginAPI)
      const req = new Request('http://localhost/users')
      const res = await app.fetch(req)
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.error).toBeDefined()
      expect(json.error.code).toBe('TAUTULLI_USERS_ERROR')
    })
  })
})
