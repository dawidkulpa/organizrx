// Emby API Type Definitions
// Self-contained types for this plugin (no cross-plugin imports)

export interface EmbySession {
  Id: string
  UserId: string
  UserName: string
  Client: string
  DeviceName: string
  DeviceId: string
  ApplicationVersion: string
  RemoteEndPoint?: string
  PlayState?: {
    PositionTicks?: number
    IsPaused?: boolean
    PlayMethod?: 'Transcode' | 'DirectStream' | 'DirectPlay'
  }
  NowPlayingItem?: EmbyItem
  TranscodingInfo?: {
    Bitrate?: number
    CompletionPercentage?: number
    VideoCodec?: string
    AudioCodec?: string
    AudioChannels?: number
  }
}

export interface EmbyItem {
  Id: string
  Name: string
  ServerId: string
  Type: 'Movie' | 'Series' | 'Episode' | 'MusicAlbum' | 'Audio' | 'Video'
  RunTimeTicks?: number
  ProductionYear?: number
  PremiereDate?: string
  CommunityRating?: number
  Overview?: string
  Taglines?: string[]
  Genres?: string[]
  People?: EmbyPerson[]
  SeriesId?: string
  SeriesName?: string
  ParentIndexNumber?: number
  IndexNumber?: number
  AlbumId?: string
  AlbumArtist?: string
  Album?: string
  ImageTags?: {
    Primary?: string
    Thumb?: string
    Backdrop?: string
  }
  BackdropImageTags?: string[]
  ParentBackdropImageTags?: string[]
  ParentThumbItemId?: string
  ParentBackdropItemId?: string
  MediaStreams?: EmbyMediaStream[]
  Container?: string
}

export interface EmbyPerson {
  Id: string
  Name: string
  Role?: string
  PrimaryImageTag?: string
}

export interface EmbyMediaStream {
  Codec: string
  Width?: number
  Height?: number
  Type: 'Video' | 'Audio' | 'Subtitle'
}

export interface EmbyUser {
  Id: string
  Name: string
  Policy?: {
    IsAdministrator?: boolean
  }
}

// Frontend-facing transformed types
export interface ResolvedEmbyItem {
  uid: string
  type: 'movie' | 'tv' | 'music' | 'video'
  title: string
  secondaryTitle: string
  summary: string
  ratingKey: string
  thumb: string
  key: string
  nowPlayingThumb: string | false
  nowPlayingKey: string | false
  metadataKey: string
  nowPlayingImageType: string
  imageType: string | false
  elapsed: number | null
  duration: number
  watched: number
  transcoded: number
  stream?: string
  id: string
  session?: string
  bandwidth: number | string
  bandwidthType: 'wan'
  sessionType: 'Transcoding' | 'Direct Playing'
  state: 'play' | 'pause'
  user: string
  userThumb: string
  userAddress: string
  address: string
  nowPlayingTitle?: string
  nowPlayingBottom?: string
  nowPlayingOriginalImage: string
  originalImage: string
  nowPlayingImageURL?: string
  imageURL?: string
  openTab: boolean
  tabName: string
  userStream: {
    platform: string
    product: string
    device: string
    stream?: string
    videoResolution: number | string
    throttled: boolean
    sourceVideoCodec: string
    videoCodec?: string
    audioCodec?: string
    sourceAudioCodec: string
    videoDecision: string
    audioDecision: string
    container: string
    audioChannels?: number
  }
  metadata: {
    guid: string
    summary: string
    rating: string
    duration: string
    originallyAvailableAt: string
    year: string
    tagline: string
    genres: string[]
    actors: Array<{
      name: string
      role: string
      thumb: string
    }>
  }
}
