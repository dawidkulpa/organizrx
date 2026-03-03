import { Hono } from 'hono'
import type { PluginAPI } from '@organizrx/plugin-sdk'
import { NzbGetClient } from './nzbget-client'
import type { QueueResponse, HistoryResponse } from './api-types'

export function createApiRoutes(api: PluginAPI) {
  const app = new Hono()

  // Middleware to create NZBGet client from settings
  app.use('*', async (c, next) => {
    const baseUrl = await api.settings.get('nzbget_url')
    const username = await api.settings.get('nzbget_username')
    const password = await api.settings.get('nzbget_password')

    if (!baseUrl) {
      return c.json(
        {
          error: {
            code: 'MISSING_CONFIG',
            message: 'NZBGet URL must be configured',
          },
        },
        422
      )
    }

    const client = new NzbGetClient(api, baseUrl, username || '', password || '')
    c.set('nzbget', client)

    return next()
  })

  // GET /queue - Get download queue
  app.get('/queue', async (c) => {
    try {
      const client = c.get('nzbget') as NzbGetClient
      const groups = await client.listGroups()

      const response: QueueResponse = {
        groups,
        totalSizeMB: groups.reduce((sum, g) => sum + g.FileSizeMB, 0),
        remainingSizeMB: groups.reduce((sum, g) => sum + g.RemainingSizeMB, 0),
        downloadRate: groups.reduce((sum, g) => sum + g.DownloadRate, 0),
        activeCount: groups.filter((g) => g.Status === 'DOWNLOADING' || g.Status === 'PAUSED')
          .length,
      }

      return c.json({ data: response })
    } catch (error) {
      api.logger.error('Failed to fetch queue', {
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json(
        {
          error: {
            code: 'FETCH_ERROR',
            message: error instanceof Error ? error.message : 'Failed to fetch queue',
          },
        },
        500
      )
    }
  })

  // GET /history - Get download history
  app.get('/history', async (c) => {
    try {
      const client = c.get('nzbget') as NzbGetClient
      const items = await client.getHistory()

      const response: HistoryResponse = {
        items,
        totalCount: items.length,
      }

      return c.json({ data: response })
    } catch (error) {
      api.logger.error('Failed to fetch history', {
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json(
        {
          error: {
            code: 'FETCH_ERROR',
            message: error instanceof Error ? error.message : 'Failed to fetch history',
          },
        },
        500
      )
    }
  })

  // POST /pause - Pause a download by ID
  app.post('/pause', async (c) => {
    try {
      const client = c.get('nzbget') as NzbGetClient
      const body = (await c.req.json()) as { nzbId: number }

      if (!body.nzbId) {
        return c.json(
          {
            error: {
              code: 'INVALID_REQUEST',
              message: 'nzbId is required',
            },
          },
          400
        )
      }

      const result = await client.pauseDownload(body.nzbId)
      return c.json({ data: { success: result } })
    } catch (error) {
      api.logger.error('Failed to pause download', {
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json(
        {
          error: {
            code: 'ACTION_ERROR',
            message: error instanceof Error ? error.message : 'Failed to pause download',
          },
        },
        500
      )
    }
  })

  // POST /resume - Resume a download by ID
  app.post('/resume', async (c) => {
    try {
      const client = c.get('nzbget') as NzbGetClient
      const body = (await c.req.json()) as { nzbId: number }

      if (!body.nzbId) {
        return c.json(
          {
            error: {
              code: 'INVALID_REQUEST',
              message: 'nzbId is required',
            },
          },
          400
        )
      }

      const result = await client.resumeDownload(body.nzbId)
      return c.json({ data: { success: result } })
    } catch (error) {
      api.logger.error('Failed to resume download', {
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json(
        {
          error: {
            code: 'ACTION_ERROR',
            message: error instanceof Error ? error.message : 'Failed to resume download',
          },
        },
        500
      )
    }
  })

  return app
}
