// TypeScript interfaces for Radarr API v3 responses

export interface RadarrImage {
  coverType: 'poster' | 'banner' | 'fanart' | 'screenshot'
  url: string
  remoteUrl?: string
}

export interface RadarrQuality {
  quality: {
    id: number
    name: string
    resolution: number
  }
  revision: {
    version: number
    real: number
    isRepack: boolean
  }
}

export interface RadarrMediaInfo {
  audioChannels?: string | number
  audioCodec?: string
  audioFormat?: string
  videoCodec?: string
  videoBitrate?: number
  videoBitDepth?: number
  videoColourPrimaries?: string
  resolution?: string
  runTime?: string
}

export interface RadarrMovieFile {
  id: number
  movieId: number
  relativePath: string
  path: string
  size: number
  dateAdded: string
  quality: RadarrQuality
  mediaInfo?: RadarrMediaInfo
}

export interface RadarrRating {
  votes: number
  value: number
  type: string
}

export interface RadarrAlternativeTitle {
  id?: number
  sourceType: string
  movieMetadataId: number
  title: string
  cleanTitle?: string
}

export interface RadarrMovie {
  id: number
  title: string
  originalTitle?: string
  alternateTitles?: RadarrAlternativeTitle[]
  secondaryYear?: number
  sortTitle: string
  sizeOnDisk?: number
  status: 'tba' | 'announced' | 'inCinemas' | 'released' | 'deleted'
  overview: string
  inCinemas?: string
  physicalRelease?: string
  digitalRelease?: string
  images: RadarrImage[]
  website?: string
  year: number
  hasFile: boolean
  youTubeTrailerId?: string
  studio?: string
  path: string
  qualityProfileId: number
  monitored: boolean
  minimumAvailability: string
  isAvailable: boolean
  folderName?: string
  runtime: number
  cleanTitle: string
  imdbId?: string
  tmdbId: number
  titleSlug: string
  genres: string[]
  tags?: number[]
  added: string
  ratings: {
    imdb?: RadarrRating
    tmdb?: RadarrRating
    rottenTomatoes?: RadarrRating
    value?: number
  }
  movieFile?: RadarrMovieFile
  collection?: {
    title: string
    tmdbId: number
  }
}

export interface RadarrQueueItem {
  id: number
  movieId: number
  movie?: RadarrMovie
  languages?: Array<{
    id: number
    name: string
  }>
  quality: RadarrQuality
  size: number
  title: string
  sizeleft: number
  timeleft?: string
  estimatedCompletionTime?: string
  added?: string
  status: string
  trackedDownloadStatus?: string
  trackedDownloadState?: string
  statusMessages?: Array<{
    title: string
    messages: string[]
  }>
  errorMessage?: string
  downloadId?: string
  protocol: 'usenet' | 'torrent'
  downloadClient?: string
  downloadClientHasPostImportCategory?: boolean
  indexer?: string
  outputPath?: string
}

export interface RadarrQueueResponse {
  page: number
  pageSize: number
  sortKey: string
  sortDirection: string
  totalRecords: number
  records: RadarrQueueItem[]
}

export interface RadarrCalendarItem extends RadarrMovie {
  // Calendar items are movies with release date info
}

export interface PluginSettings {
  radarr_url: string
  radarr_api_key: string
  radarr_base_path?: string
  radarr_disable_cert_check?: boolean
  radarr_show_unmonitored?: boolean
  radarr_show_physical_release?: boolean
  radarr_show_digital_release?: boolean
  radarr_show_cinema_release?: boolean
}
