import { Hono } from 'hono'
import type { PluginAPI } from '@organizrx/plugin-sdk'

interface TautulliSession {
  session_key: string
  user: string
  friendly_name: string
  ip_address: string
  player: string
  product: string
  platform: string
  title: string
  year: number
  parent_title?: string
  grandparent_title?: string
  media_type: string
  thumb: string
  art: string
  state: string
  progress_percent: number
  duration: number
  view_offset: number
  transcode_decision: string
  video_resolution: string
  video_full_resolution: string
  video_bitrate: number
  audio_codec: string
  audio_channels: number
  stream_container_decision: string
  stream_video_decision: string
  stream_audio_decision: string
  bandwidth: number
  quality_profile: string
  optimized_version: boolean
}

interface TautulliActivity {
  stream_count: number
  stream_count_direct_play: number
  stream_count_direct_stream: number
  stream_count_transcode: number
  total_bandwidth: number
  lan_bandwidth: number
  wan_bandwidth: number
  sessions: TautulliSession[]
}

interface TautulliHistoryItem {
  reference_id: number
  row_id: number
  id: number
  date: number
  started: number
  stopped: number
  duration: number
  paused_counter: number
  user: string
  user_id: number
  friendly_name: string
  platform: string
  product: string
  player: string
  ip_address: string
  live: number
  machine_id: string
  location: string
  bandwidth: number
  quality_profile: string
  media_type: string
  rating_key: string
  parent_rating_key: string
  grandparent_rating_key: string
  full_title: string
  title: string
  parent_title: string
  grandparent_title: string
  original_title: string
  year: number
  media_index: number
  parent_media_index: number
  thumb: string
  originally_available_at: string
  guid: string
  transcode_decision: string
  percent_complete: number
  watched_status: number
  group_count: number
  group_ids: string
  state: null | string
  session_key: null | string
}

interface TautulliHistory {
  recordsFiltered: number
  recordsTotal: number
  draw: number
  filter_duration: string
  total_duration: string
  data: TautulliHistoryItem[]
}

interface TautulliUser {
  user_id: number
  username: string
  friendly_name: string
  email: string
  thumb: string
  is_admin: number
  is_home_user: number
  is_allow_sync: number
  is_restricted: number
  do_notify: number
  keep_history: number
  allow_guest: number
  deleted_user: number
  shared_libraries: string[]
  filter_all: string
  filter_movies: string
  filter_tv: string
  filter_music: string
  filter_photos: string
}

interface TautulliUsersResponse {
  data: TautulliUser[]
}

interface TautulliApiResponse<T> {
  response: {
    result: 'success' | 'error'
    message: string | null
    data: T
  }
}

export function createTautulliAPI(pluginAPI: PluginAPI) {
  const app = new Hono()

  async function fetchTautulli<T>(cmd: string, params: Record<string, string> = {}): Promise<T> {
    const url = await pluginAPI.settings.get('tautulli_url')
    const apiKey = await pluginAPI.settings.get('tautulli_api_key')

    if (!url) {
      throw new Error('Tautulli URL is not configured')
    }

    if (!apiKey) {
      throw new Error('Tautulli API key is not configured')
    }

    const queryParams = new URLSearchParams({
      apikey: apiKey,
      cmd,
      ...params,
    })

    const apiUrl = `${url.replace(/\/$/, '')}/api/v2?${queryParams.toString()}`

    pluginAPI.logger.debug('Fetching Tautulli API', { cmd, url: apiUrl.replace(apiKey, '***') })

    const response = await pluginAPI.http.fetch(apiUrl)

    if (!response.ok) {
      pluginAPI.logger.error('Tautulli API request failed', {
        status: response.status,
        statusText: response.statusText,
      })
      throw new Error(`Tautulli API request failed: ${response.statusText}`)
    }

    const json = (await response.json()) as TautulliApiResponse<T>

    if (json.response.result === 'error') {
      pluginAPI.logger.error('Tautulli API returned error', { message: json.response.message })
      throw new Error(json.response.message || 'Unknown Tautulli API error')
    }

    return json.response.data
  }

  app.get('/activity', async (c) => {
    try {
      const data = await fetchTautulli<TautulliActivity>('get_activity')
      return c.json({ data })
    } catch (error) {
      pluginAPI.logger.error('Failed to fetch Tautulli activity', {
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json(
        {
          error: {
            code: 'TAUTULLI_ACTIVITY_ERROR',
            message: error instanceof Error ? error.message : 'Failed to fetch activity',
          },
        },
        500
      )
    }
  })

  app.get('/history', async (c) => {
    try {
      const length = c.req.query('length') || '10'
      const start = c.req.query('start') || '0'

      const data = await fetchTautulli<TautulliHistory>('get_history', {
        length,
        start,
        order_column: 'date',
        order_dir: 'desc',
      })
      return c.json({ data })
    } catch (error) {
      pluginAPI.logger.error('Failed to fetch Tautulli history', {
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json(
        {
          error: {
            code: 'TAUTULLI_HISTORY_ERROR',
            message: error instanceof Error ? error.message : 'Failed to fetch history',
          },
        },
        500
      )
    }
  })

  app.get('/users', async (c) => {
    try {
      const data = await fetchTautulli<TautulliUsersResponse>('get_users_table')
      return c.json({ data })
    } catch (error) {
      pluginAPI.logger.error('Failed to fetch Tautulli users', {
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json(
        {
          error: {
            code: 'TAUTULLI_USERS_ERROR',
            message: error instanceof Error ? error.message : 'Failed to fetch users',
          },
        },
        500
      )
    }
  })

  return app
}
