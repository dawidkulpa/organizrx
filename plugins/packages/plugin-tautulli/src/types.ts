export interface TautulliSession {
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

export interface TautulliActivity {
  stream_count: number
  stream_count_direct_play: number
  stream_count_direct_stream: number
  stream_count_transcode: number
  total_bandwidth: number
  lan_bandwidth: number
  wan_bandwidth: number
  sessions: TautulliSession[]
}

export interface TautulliHistoryItem {
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

export interface TautulliHistory {
  recordsFiltered: number
  recordsTotal: number
  draw: number
  filter_duration: string
  total_duration: string
  data: TautulliHistoryItem[]
}

export interface ActivityWidgetProps {
  pluginId: string
}

export interface HistoryWidgetProps {
  pluginId: string
}
