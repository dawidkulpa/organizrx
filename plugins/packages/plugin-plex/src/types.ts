// TypeScript interfaces for Plex API response shapes

export interface PlexMediaContainer {
  MediaContainer: {
    size: string
    Video?: PlexVideo[]
    Track?: PlexTrack[]
  }
}

export interface PlexVideo {
  type: 'movie' | 'show' | 'season' | 'episode' | 'clip'
  title: string
  ratingKey: string
  librarySectionID: string
  year?: string
  summary?: string
  thumb?: string
  art?: string
  duration?: string
  addedAt?: string
  viewOffset?: string
  guid?: string
  rating?: string
  originallyAvailableAt?: string
  studio?: string
  tagline?: string
  parentTitle?: string
  grandparentTitle?: string
  parentRatingKey?: string
  grandparentRatingKey?: string
  parentThumb?: string
  grandparentThumb?: string
  grandparentArt?: string
  parentIndex?: string
  index?: string
  live?: boolean
  extraType?: string
  Media?: PlexMedia[]
  Genre?: PlexGenre[]
  Role?: PlexRole[]
  User?: PlexUser
  Player?: PlexPlayer
  Session?: PlexSession
  TranscodeSession?: PlexTranscodeSession
}

export interface PlexTrack {
  type: 'album' | 'track'
  title: string
  ratingKey: string
  librarySectionID: string
  parentTitle?: string
  grandparentTitle?: string
  parentRatingKey?: string
  grandparentRatingKey?: string
  thumb?: string
  parentThumb?: string
  art?: string
  duration?: string
  addedAt?: string
  viewOffset?: string
  Media?: PlexMedia[]
  User?: PlexUser
  Player?: PlexPlayer
  Session?: PlexSession
  TranscodeSession?: PlexTranscodeSession
}

export interface PlexMedia {
  duration?: string
  Part?: PlexPart[]
  videoResolution?: string
}

export interface PlexPart {
  decision?: string
  Stream?: PlexStream[]
}

export interface PlexStream {
  decision?: string
}

export interface PlexGenre {
  tag: string
}

export interface PlexRole {
  tag: string
  role?: string
  thumb?: string
}

export interface PlexUser {
  title: string
  thumb?: string
}

export interface PlexPlayer {
  state: 'playing' | 'paused' | 'buffering'
  address: string
  machineIdentifier: string
  platform?: string
  product?: string
  device?: string
}

export interface PlexSession {
  id: string
  bandwidth?: string
  location?: string
}

export interface PlexTranscodeSession {
  progress?: string
  throttled?: string
  videoDecision?: string
  audioDecision?: string
  sourceVideoCodec?: string
  videoCodec?: string
  audioCodec?: string
  sourceAudioCodec?: string
  container?: string
  audioChannels?: string
}

export interface PlexPlaylist {
  type: string
  title: string
  ratingKey: string
  key: string
  playlistType: 'video' | 'audio'
}

// Resolved Plex Item for frontend consumption
export interface ResolvedPlexItem {
  type: 'movie' | 'tv' | 'music' | 'clip'
  originalType: string
  uid: string
  title: string
  secondaryTitle: string
  summary: string
  ratingKey: string
  thumb: string
  key: string
  nowPlayingThumb: string
  nowPlayingKey: string
  nowPlayingTitle: string
  nowPlayingBottom: string
  metadataKey: string
  elapsed: number | null
  duration: number
  addedAt: number | null
  watched: number
  transcoded: string | number
  stream: string
  id: string
  session: string
  bandwidth: string
  bandwidthType: string
  sessionType: string
  state: 'play' | 'pause'
  user: string
  userThumb: string
  userAddress: string
  address: string
  nowPlayingOriginalImage: string
  originalImage: string
  nowPlayingImageURL?: string
  imageURL?: string
  openTab: boolean
  tabName: string
  useImage?: string
  userStream: {
    platform: string
    product: string
    device: string
    stream: string
    videoResolution: string
    throttled: boolean
    sourceVideoCodec: string
    videoCodec: string
    audioCodec: string
    sourceAudioCodec: string
    videoDecision: string
    audioDecision: string
    container: string
    audioChannels: string
  }
  metadata: {
    guid: string
    summary: string
    rating: string
    duration: string
    originallyAvailableAt: string
    year: string
    studio: string
    tagline: string
    genres: string[]
    actors: {
      name: string
      role: string
      thumb: string
    }[]
  }
}

// API Response envelope
export interface PlexAPIResponse<T> {
  data: T
}
