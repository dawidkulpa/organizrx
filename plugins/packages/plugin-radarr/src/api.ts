import { Hono } from 'hono'
import { z } from 'zod'
import type { PluginAPI } from '@organizrx/plugin-sdk'
import type { RadarrCalendarItem, RadarrQueueResponse, RadarrMovie, PluginSettings } from './types'

// Zod schemas for validation
const CalendarQuerySchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
})

const MovieParamsSchema = z.object({
  id: z.string().regex(/^\d+$/),
})

/**
 * Create the Radarr Hono sub-app with API routes
 */
export function createRadarrAPI(api: PluginAPI) {
  const app = new Hono()

  /**
   * Helper: Get plugin settings
   */
  async function getSettings(): Promise<PluginSettings> {
    const url = await api.settings.get('radarr_url')
    const apiKey = await api.settings.get('radarr_api_key')
    const basePath = await api.settings.get('radarr_base_path')
    const disableCertCheck = await api.settings.getBoolean('radarr_disable_cert_check', false)
    const showUnmonitored = await api.settings.getBoolean('radarr_show_unmonitored', false)
    const showPhysicalRelease = await api.settings.getBoolean('radarr_show_physical_release', true)
    const showDigitalRelease = await api.settings.getBoolean('radarr_show_digital_release', true)
    const showCinemaRelease = await api.settings.getBoolean('radarr_show_cinema_release', true)

    if (!url || !apiKey) {
      throw new Error('Radarr URL and API key must be configured')
    }

    return {
      radarr_url: url,
      radarr_api_key: apiKey,
      radarr_base_path: basePath || undefined,
      radarr_disable_cert_check: disableCertCheck,
      radarr_show_unmonitored: showUnmonitored,
      radarr_show_physical_release: showPhysicalRelease,
      radarr_show_digital_release: showDigitalRelease,
      radarr_show_cinema_release: showCinemaRelease,
    }
  }

  /**
   * Helper: Build Radarr API URL
   */
  function buildRadarrURL(settings: PluginSettings, endpoint: string): string {
    const baseURL = settings.radarr_url.replace(/\/+$/, '')
    const basePath = settings.radarr_base_path?.replace(/^\/+|\/+$/g, '') || ''
    const fullBase = basePath ? `${baseURL}/${basePath}` : baseURL
    return `${fullBase}/api/v3${endpoint}`
  }

  /**
   * Helper: Fetch from Radarr API
   */
  async function fetchRadarr<T>(
    settings: PluginSettings,
    endpoint: string,
    params?: Record<string, string>
  ): Promise<T> {
    const url = new URL(buildRadarrURL(settings, endpoint))
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }

    api.logger.info('Fetching from Radarr', { url: url.toString() })

    const response = await api.http.fetch(url.toString(), {
      headers: {
        'X-Api-Key': settings.radarr_api_key,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      api.logger.error('Radarr API request failed', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: url.toString(),
      })
      throw new Error(`Radarr API error: ${response.status} ${response.statusText}`)
    }

    return response.json() as Promise<T>
  }

  /**
   * GET /calendar — Upcoming movie releases
   */
  app.get('/calendar', async (c) => {
    try {
      const query = CalendarQuerySchema.parse(c.req.query())
      const settings = await getSettings()

      // Default to -7 days to +30 days
      const start =
        query.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const end =
        query.end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const params: Record<string, string> = {
        start,
        end,
        unmonitored: settings.radarr_show_unmonitored ? 'true' : 'false',
      }

      const calendar = await fetchRadarr<RadarrCalendarItem[]>(settings, '/calendar', params)

      api.logger.info('Calendar fetched', { count: calendar.length })

      return c.json({
        data: calendar,
      })
    } catch (error) {
      api.logger.error('Calendar fetch failed', { error })
      if (error instanceof z.ZodError) {
        return c.json({ error: { code: 'VALIDATION_ERROR', message: error.message } }, 400)
      }
      if (error instanceof Error) {
        return c.json({ error: { code: 'RADARR_ERROR', message: error.message } }, 500)
      }
      return c.json({ error: { code: 'UNKNOWN_ERROR', message: 'An unknown error occurred' } }, 500)
    }
  })

  /**
   * GET /queue — Active downloads
   */
  app.get('/queue', async (c) => {
    try {
      const settings = await getSettings()

      const queue = await fetchRadarr<RadarrQueueResponse>(settings, '/queue', {
        includeUnknownMovieItems: 'false',
        includeMovie: 'true',
      })

      api.logger.info('Queue fetched', { count: queue.totalRecords })

      return c.json({
        data: queue,
      })
    } catch (error) {
      api.logger.error('Queue fetch failed', { error })
      if (error instanceof Error) {
        return c.json({ error: { code: 'RADARR_ERROR', message: error.message } }, 500)
      }
      return c.json({ error: { code: 'UNKNOWN_ERROR', message: 'An unknown error occurred' } }, 500)
    }
  })

  /**
   * GET /movie/:id — Movie details by TMDB ID
   */
  app.get('/movie/:id', async (c) => {
    try {
      const params = MovieParamsSchema.parse(c.req.param())
      const settings = await getSettings()

      const movies = await fetchRadarr<RadarrMovie[]>(settings, '/movie')
      const movie = movies.find((m) => m.tmdbId.toString() === params.id)

      if (!movie) {
        return c.json({ error: { code: 'NOT_FOUND', message: 'Movie not found' } }, 404)
      }

      api.logger.info('Movie fetched', { tmdbId: params.id, title: movie.title })

      return c.json({
        data: movie,
      })
    } catch (error) {
      api.logger.error('Movie fetch failed', { error })
      if (error instanceof z.ZodError) {
        return c.json({ error: { code: 'VALIDATION_ERROR', message: error.message } }, 400)
      }
      if (error instanceof Error) {
        return c.json({ error: { code: 'RADARR_ERROR', message: error.message } }, 500)
      }
      return c.json({ error: { code: 'UNKNOWN_ERROR', message: 'An unknown error occurred' } }, 500)
    }
  })

  return app
}
