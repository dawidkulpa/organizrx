import { describe, it, expect, mock, beforeEach } from 'bun:test'
import type { PluginAPI } from '@organizrx/plugin-sdk'
import { createPlexAPI } from './api'

// Mock PluginAPI
function createMockAPI(): PluginAPI {
  return {
    settings: {
      get: mock(async (key: string) => {
        const settings: Record<string, string> = {
          plex_url: 'http://localhost:32400',
          plex_token: 'test-token-123',
          machine_identifier: 'test-machine-id',
        }
        return settings[key] || null
      }),
      getNumber: mock(async () => 0),
      getBoolean: mock(async () => false),
      getJSON: mock(async () => ({})),
      set: mock(async () => {}),
    },
    logger: {
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
      debug: mock(() => {}),
    },
    http: {
      fetch: mock(async () => new Response()),
    },
  }
}

describe('Plex API', () => {
  let mockAPI: PluginAPI
  let app: ReturnType<typeof createPlexAPI>

  beforeEach(() => {
    mockAPI = createMockAPI()
    app = createPlexAPI(mockAPI)
  })

  describe('GET /streams', () => {
    it('should return active streams', async () => {
      const mockResponse = {
        MediaContainer: {
          size: '2',
          Video: [
            {
              type: 'movie',
              title: 'Test Movie',
              ratingKey: '123',
              librarySectionID: '1',
              year: '2024',
              summary: 'A test movie',
              thumb: '/thumb.jpg',
              art: '/art.jpg',
              duration: '7200000',
              Player: {
                state: 'playing',
                address: '192.168.1.100',
                machineIdentifier: 'test-player',
              },
              Session: {
                id: 'session-1',
              },
              User: {
                title: 'TestUser',
              },
            },
            {
              type: 'episode',
              title: 'Test Episode',
              ratingKey: '456',
              librarySectionID: '2',
              grandparentTitle: 'Test Show',
              parentTitle: 'Season 1',
              parentIndex: '1',
              index: '1',
              grandparentArt: '/show-art.jpg',
              parentThumb: '/season-thumb.jpg',
              grandparentRatingKey: '100',
              duration: '3600000',
              Player: {
                state: 'paused',
                address: '192.168.1.101',
                machineIdentifier: 'test-player-2',
              },
              Session: {
                id: 'session-2',
              },
              User: {
                title: 'TestUser2',
              },
            },
          ],
        },
      }

      mockAPI.http.fetch = mock(
        async () =>
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
      )

      const req = new Request('http://localhost/streams')
      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data).toBeDefined()
      expect(data.data.length).toBe(2)
      expect(data.data[0].title).toBe('Test Movie')
      expect(data.data[0].type).toBe('movie')
      expect(data.data[1].title).toBe('Test Show')
      expect(data.data[1].type).toBe('tv')
    })

    it('should filter excluded libraries', async () => {
      const mockResponse = {
        MediaContainer: {
          size: '2',
          Video: [
            {
              type: 'movie',
              title: 'Included Movie',
              ratingKey: '123',
              librarySectionID: '1',
              duration: '7200000',
              Player: {
                state: 'playing',
                address: '192.168.1.100',
                machineIdentifier: 'test-player',
              },
              Session: { id: 'session-1' },
              User: { title: 'TestUser' },
            },
            {
              type: 'movie',
              title: 'Excluded Movie',
              ratingKey: '456',
              librarySectionID: '999',
              duration: '7200000',
              Player: {
                state: 'playing',
                address: '192.168.1.100',
                machineIdentifier: 'test-player',
              },
              Session: { id: 'session-2' },
              User: { title: 'TestUser' },
            },
          ],
        },
      }

      mockAPI.http.fetch = mock(
        async () =>
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
      )

      const req = new Request('http://localhost/streams?exclude=999')
      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data.length).toBe(1)
      expect(data.data[0].title).toBe('Included Movie')
    })

    it('should handle connection errors', async () => {
      mockAPI.http.fetch = mock(async () => {
        throw new Error('Connection refused')
      })

      const req = new Request('http://localhost/streams')
      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe('FETCH_FAILED')
    })

    it('should handle missing configuration', async () => {
      mockAPI.settings.get = mock(async () => null)

      const req = new Request('http://localhost/streams')
      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data.error).toBeDefined()
    })

    it('should handle Plex API errors', async () => {
      mockAPI.http.fetch = mock(
        async () =>
          new Response('Unauthorized', {
            status: 401,
            statusText: 'Unauthorized',
          })
      )

      const req = new Request('http://localhost/streams')
      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data.error).toBeDefined()
    })
  })

  describe('GET /recent', () => {
    it('should return recently added items', async () => {
      const mockResponse = {
        MediaContainer: {
          size: '1',
          Video: [
            {
              type: 'movie',
              title: 'Recent Movie',
              ratingKey: '789',
              librarySectionID: '1',
              year: '2024',
              thumb: '/thumb.jpg',
              addedAt: '1640000000',
              duration: '7200000',
            },
          ],
        },
      }

      mockAPI.http.fetch = mock(
        async () =>
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
      )

      const req = new Request('http://localhost/recent?limit=10')
      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data).toBeDefined()
      expect(Array.isArray(data.data)).toBe(true)
      expect(mockAPI.http.fetch).toHaveBeenCalled()
    })

    it('should respect limit parameter', async () => {
      const mockResponse = {
        MediaContainer: { size: '0', Video: [] },
      }

      mockAPI.http.fetch = mock(async (url: string) => {
        expect(url).toContain('X-Plex-Container-Size=5')
        return new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const req = new Request('http://localhost/recent?limit=5')
      await app.fetch(req)

      expect(mockAPI.http.fetch).toHaveBeenCalled()
    })

    it('should default limit to 10', async () => {
      const mockResponse = {
        MediaContainer: { size: '0', Video: [] },
      }

      mockAPI.http.fetch = mock(async (url: string) => {
        expect(url).toContain('X-Plex-Container-Size=10')
        return new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const req = new Request('http://localhost/recent')
      await app.fetch(req)

      expect(mockAPI.http.fetch).toHaveBeenCalled()
    })
  })

  describe('GET /playlists', () => {
    it('should return playlists', async () => {
      const playlistListResponse = {
        MediaContainer: {
          Playlist: [
            {
              type: 'playlist',
              title: 'Test Playlist',
              ratingKey: '1',
              key: '/playlists/1/items',
              playlistType: 'video',
            },
          ],
        },
      }

      const playlistItemsResponse = {
        MediaContainer: {
          Video: [
            {
              type: 'movie',
              title: 'Playlist Movie',
              ratingKey: '123',
              librarySectionID: '1',
              duration: '7200000',
            },
          ],
        },
      }

      let callCount = 0
      mockAPI.http.fetch = mock(async () => {
        callCount++
        const response = callCount === 1 ? playlistListResponse : playlistItemsResponse
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const req = new Request('http://localhost/playlists')
      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data).toBeDefined()
      expect(typeof data.data).toBe('object')
    })

    it('should filter private playlists', async () => {
      const mockResponse = {
        MediaContainer: {
          Playlist: [
            {
              type: 'playlist',
              title: 'Private Playlist',
              ratingKey: '1',
              key: '/playlists/1/items',
              playlistType: 'video',
            },
          ],
        },
      }

      mockAPI.http.fetch = mock(
        async () =>
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
      )

      const req = new Request('http://localhost/playlists')
      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(Object.keys(data.data).length).toBe(0)
    })
  })

  describe('GET /search', () => {
    it('should search media', async () => {
      const mockResponse = {
        MediaContainer: {
          Video: [
            {
              type: 'movie',
              title: 'Search Result',
              ratingKey: '999',
              librarySectionID: '1',
              duration: '7200000',
            },
          ],
        },
      }

      mockAPI.http.fetch = mock(async (url: string) => {
        expect(url).toContain('query=test')
        return new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const req = new Request('http://localhost/search?q=test')
      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data).toBeDefined()
      expect(data.data.length).toBe(1)
      expect(data.data[0].title).toBe('Search Result')
    })

    it('should require query parameter', async () => {
      const req = new Request('http://localhost/search')
      const res = await app.fetch(req)

      expect(res.status).toBe(500)
    })

    it('should filter ignored types', async () => {
      const mockResponse = {
        MediaContainer: {
          Video: [
            {
              type: 'movie',
              title: 'Movie Result',
              ratingKey: '1',
              librarySectionID: '1',
              duration: '7200000',
            },
            {
              type: 'episode',
              title: 'Episode Result',
              ratingKey: '2',
              librarySectionID: '1',
              duration: '3600000',
            },
          ],
        },
      }

      mockAPI.http.fetch = mock(
        async () =>
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
      )

      const req = new Request('http://localhost/search?q=test')
      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data.length).toBe(1)
      expect(data.data[0].type).toBe('movie')
    })
  })

  describe('GET /metadata/:id', () => {
    it('should return metadata for specific item', async () => {
      const mockResponse = {
        MediaContainer: {
          Video: [
            {
              type: 'movie',
              title: 'Metadata Movie',
              ratingKey: '555',
              librarySectionID: '1',
              year: '2024',
              summary: 'Test summary',
              duration: '7200000',
              guid: 'plex://movie/12345',
              rating: '8.5',
            },
          ],
        },
      }

      mockAPI.http.fetch = mock(async (url: string) => {
        expect(url).toContain('/library/metadata/555')
        return new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const req = new Request('http://localhost/metadata/555')
      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data).toBeDefined()
      expect(data.data.title).toBe('Metadata Movie')
      expect(data.data.metadata).toBeDefined()
      expect(data.data.metadata.guid).toBe('plex://movie/12345')
    })

    it('should return 404 for non-existent item', async () => {
      const mockResponse = {
        MediaContainer: { size: '0' },
      }

      mockAPI.http.fetch = mock(
        async () =>
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
      )

      const req = new Request('http://localhost/metadata/999')
      const res = await app.fetch(req)

      expect(res.status).toBe(404)
    })
  })
})
