import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { PluginAPI } from '@organizrx/plugin-sdk'
import type { SonarrCalendarEpisode, SonarrQueue, SonarrSeries, SonarrErrorResponse } from './types'

const calendarQuerySchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  unmonitored: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
})

const seriesParamsSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'ID must be a number')
    .transform((val) => parseInt(val, 10)),
})

class SonarrAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'SonarrAPIError'
  }
}

export function createSonarrAPI(api: PluginAPI) {
  const app = new Hono()

  async function getSonarrConfig() {
    const [url, apiKey, basePath] = await Promise.all([
      api.settings.get('sonarr_url'),
      api.settings.get('sonarr_api_key'),
      api.settings.get('sonarr_base_path'),
    ])

    if (!url) {
      throw new SonarrAPIError('Sonarr URL is not configured', 422)
    }
    if (!apiKey) {
      throw new SonarrAPIError('Sonarr API key is not configured', 422)
    }

    return { url, apiKey, basePath: basePath || '' }
  }

  async function sonarrFetch<T>(
    endpoint: string,
    config: { url: string; apiKey: string; basePath: string }
  ): Promise<T> {
    const baseUrl = config.url.replace(/\/$/, '')
    const base = config.basePath ? `/${config.basePath.replace(/^\/|\/$/g, '')}` : ''
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const fullUrl = `${baseUrl}${base}${path}`

    api.logger.debug('Fetching from Sonarr', { url: fullUrl })

    try {
      const response = await api.http.fetch(fullUrl, {
        headers: {
          'X-Api-Key': config.apiKey,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `Sonarr API error: ${response.status} ${response.statusText}`

        try {
          const errorJson = JSON.parse(errorText) as SonarrErrorResponse
          if (errorJson.message) {
            errorMessage = errorJson.message
          }
        } catch {
          // If parsing fails, use the raw text
          if (errorText) {
            errorMessage += ` - ${errorText}`
          }
        }

        throw new SonarrAPIError(errorMessage, response.status)
      }

      const data = await response.json()
      return data as T
    } catch (error) {
      if (error instanceof SonarrAPIError) {
        throw error
      }

      api.logger.error('Failed to fetch from Sonarr', {
        error: error instanceof Error ? error.message : String(error),
        endpoint,
      })

      throw new SonarrAPIError(
        error instanceof Error ? error.message : 'Failed to connect to Sonarr',
        503
      )
    }
  }

  // GET /calendar - Get upcoming episodes
  app.get('/calendar', zValidator('query', calendarQuerySchema), async (c) => {
    try {
      const query = c.req.valid('query')
      const config = await getSonarrConfig()

      // Default to 7 days before and 7 days after if not specified
      const start =
        query.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const end =
        query.end || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const params = new URLSearchParams({
        start,
        end,
        includeSeries: 'true',
        includeEpisodeFile: 'true',
      })

      if (query.unmonitored !== undefined) {
        params.set('includeUnmonitored', String(query.unmonitored))
      }

      const episodes = await sonarrFetch<SonarrCalendarEpisode[]>(
        `/api/v3/calendar?${params.toString()}`,
        config
      )

      api.logger.info('Fetched calendar episodes', { count: episodes.length })

      return c.json({ data: episodes })
    } catch (error) {
      if (error instanceof SonarrAPIError) {
        api.logger.warn('Calendar fetch failed', {
          message: error.message,
          status: error.statusCode,
        })
        return c.json(
          { error: { code: 'SONARR_API_ERROR', message: error.message } },
          error.statusCode as 400 | 401 | 403 | 404 | 422 | 500 | 502 | 503
        )
      }

      api.logger.error('Unexpected calendar error', {
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch calendar' } }, 500)
    }
  })

  // GET /queue - Get download queue
  app.get('/queue', async (c) => {
    try {
      const config = await getSonarrConfig()

      const params = new URLSearchParams({
        page: '1',
        pageSize: '100',
        includeSeries: 'true',
        includeEpisode: 'true',
      })

      const queue = await sonarrFetch<SonarrQueue>(`/api/v3/queue?${params.toString()}`, config)

      api.logger.info('Fetched queue', { count: queue.records.length })

      return c.json({ data: queue })
    } catch (error) {
      if (error instanceof SonarrAPIError) {
        api.logger.warn('Queue fetch failed', {
          message: error.message,
          status: error.statusCode,
        })
        return c.json(
          { error: { code: 'SONARR_API_ERROR', message: error.message } },
          error.statusCode as 400 | 401 | 403 | 404 | 422 | 500 | 502 | 503
        )
      }

      api.logger.error('Unexpected queue error', {
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch queue' } }, 500)
    }
  })

  // GET /series/:id - Get series details
  app.get('/series/:id', zValidator('param', seriesParamsSchema), async (c) => {
    try {
      const { id } = c.req.valid('param')
      const config = await getSonarrConfig()

      const series = await sonarrFetch<SonarrSeries>(`/api/v3/series/${id}`, config)

      api.logger.info('Fetched series', { seriesId: id, title: series.title })

      return c.json({ data: series })
    } catch (error) {
      if (error instanceof SonarrAPIError) {
        api.logger.warn('Series fetch failed', {
          message: error.message,
          status: error.statusCode,
        })
        return c.json(
          { error: { code: 'SONARR_API_ERROR', message: error.message } },
          error.statusCode as 400 | 401 | 403 | 404 | 422 | 500 | 502 | 503
        )
      }

      api.logger.error('Unexpected series error', {
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch series' } }, 500)
    }
  })

  return app
}
