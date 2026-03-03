// Shared types for Jellyfin/Emby plugins
// Since Jellyfin is forked from Emby, these APIs are nearly identical

export type MediaType = 'movie' | 'tv' | 'music' | 'video'
export type PlayMethod = 'Transcode' | 'DirectPlay' | 'DirectStream'
export type ImageType = 'Primary' | 'Thumb' | 'Backdrop' | 'Logo' | 'Art' | 'Banner'

export interface MediaServerSettings {
  url: string
  apiKey: string
  disableCertCheck?: boolean
  useCustomCertificate?: boolean
}

export interface SessionInfo {
  Id: string
  UserId?: string
  UserName?: string
  Client?: string
  DeviceName?: string
  DeviceId?: string
  RemoteEndPoint?: string
  PlayState?: {
    PositionTicks?: number
    IsPaused?: boolean
    PlayMethod?: string
  }
  NowPlayingItem?: MediaItem
  TranscodingInfo?: {
    CompletionPercentage?: number
    Bitrate?: number
    VideoCodec?: string
    AudioCodec?: string
    AudioChannels?: number
  }
}

export interface MediaItem {
  Id: string
  ServerId: string
  Name: string
  Type: string
  SeriesName?: string
  SeriesId?: string
  AlbumArtist?: string
  Album?: string
  AlbumId?: string
  ProductionYear?: number
  PremiereDate?: string
  Overview?: string
  CommunityRating?: number
  RunTimeTicks?: number
  Container?: string
  ImageTags?: {
    Primary?: string
    Thumb?: string
    Logo?: string
  }
  BackdropImageTags?: string[]
  ParentThumbItemId?: string
  ParentBackdropItemId?: string
  ParentBackdropImageTags?: string[]
  ParentIndexNumber?: number
  IndexNumber?: number
  Genres?: string[]
  Taglines?: string[]
  People?: PersonInfo[]
  MediaStreams?: MediaStream[]
}

export interface PersonInfo {
  Id: string
  Name: string
  Role?: string
  Type?: string
  PrimaryImageTag?: string
}

export interface MediaStream {
  Index: number
  Type: string
  Codec: string
  Width?: number
  Height?: number
  Channels?: number
}

export interface NormalizedSession {
  uid: string
  serverId: string
  sessionId: string
  user: string
  type: MediaType
  title: string
  secondaryTitle: string
  year?: number
  posterUrl: string
  backdropUrl: string
  state: 'play' | 'pause'
  progress: number
  duration: number
  transcodeProgress: number
  streamMethod: PlayMethod | null
  client: string
  device: string
  address: string
  bandwidth?: number
  videoCodec?: string
  audioCodec?: string
  container?: string
}

export interface NormalizedMediaItem {
  uid: string
  serverId: string
  type: MediaType
  title: string
  secondaryTitle: string
  year?: number
  posterUrl: string
  backdropUrl: string
  summary?: string
  rating?: number
  genres?: string[]
  actors?: Array<{
    name: string
    role: string
    thumb: string
  }>
}
