// Sonarr API v3 response types
// Based on https://sonarr.tv/docs/api/

export interface SonarrImage {
  coverType: 'fanart' | 'banner' | 'poster'
  url?: string
  remoteUrl?: string
}

export interface SonarrRatings {
  votes: number
  value: number
}

export interface SonarrSeason {
  seasonNumber: number
  monitored: boolean
  statistics?: {
    episodeFileCount: number
    episodeCount: number
    totalEpisodeCount: number
    sizeOnDisk: number
    percentOfEpisodes: number
  }
}

export interface SonarrSeries {
  title: string
  sortTitle: string
  seasonCount: number
  status: 'continuing' | 'ended' | 'upcoming' | 'deleted'
  overview: string
  network?: string
  airTime?: string
  images: SonarrImage[]
  seasons: SonarrSeason[]
  year?: number
  path: string
  profileId: number
  languageProfileId?: number
  seasonFolder: boolean
  monitored: boolean
  useSceneNumbering: boolean
  runtime: number
  tvdbId: number
  tvRageId?: number
  tvMazeId?: number
  firstAired?: string
  seriesType: 'standard' | 'daily' | 'anime'
  cleanTitle: string
  imdbId?: string
  titleSlug: string
  certification?: string
  genres: string[]
  tags: number[]
  added: string
  ratings: SonarrRatings
  qualityProfileId: number
  id: number
}

export interface SonarrEpisodeFile {
  seriesId: number
  seasonNumber: number
  relativePath: string
  path: string
  size: number
  dateAdded: string
  quality: {
    quality: {
      id: number
      name: string
      source: string
      resolution: number
    }
    revision: {
      version: number
      real: number
      isRepack: boolean
    }
  }
  mediaInfo?: {
    audioBitrate: number
    audioChannels: number
    audioCodec: string
    audioLanguages: string
    audioStreamCount: number
    videoBitDepth: number
    videoBitrate: number
    videoCodec: string
    videoFps: number
    resolution: string
    runTime: string
    scanType: string
    subtitles: string
  }
  qualityCutoffNotMet: boolean
  id: number
}

export interface SonarrCalendarEpisode {
  seriesId: number
  episodeFileId: number
  seasonNumber: number
  episodeNumber: number
  title: string
  airDate: string
  airDateUtc: string
  overview?: string
  hasFile: boolean
  monitored: boolean
  absoluteEpisodeNumber?: number
  sceneAbsoluteEpisodeNumber?: number
  sceneEpisodeNumber?: number
  sceneSeasonNumber?: number
  unverifiedSceneNumbering: boolean
  id: number
  series: SonarrSeries
  episodeFile?: SonarrEpisodeFile
}

export interface SonarrQueueRecord {
  seriesId: number
  episodeId: number
  series: SonarrSeries
  episode: {
    seriesId: number
    episodeFileId: number
    seasonNumber: number
    episodeNumber: number
    title: string
    airDate: string
    airDateUtc: string
    overview?: string
    hasFile: boolean
    monitored: boolean
    id: number
  }
  quality: {
    quality: {
      id: number
      name: string
    }
    revision: {
      version: number
      real: number
    }
  }
  size: number
  title: string
  sizeleft: number
  timeleft?: string
  estimatedCompletionTime?: string
  status: string
  trackedDownloadStatus?: string
  trackedDownloadState?: string
  statusMessages?: Array<{
    title: string
    messages: string[]
  }>
  downloadId?: string
  protocol: 'unknown' | 'usenet' | 'torrent'
  downloadClient?: string
  indexer?: string
  outputPath?: string
  id: number
}

export interface SonarrQueue {
  page: number
  pageSize: number
  sortKey: string
  sortDirection: 'ascending' | 'descending'
  totalRecords: number
  records: SonarrQueueRecord[]
}

export interface SonarrErrorResponse {
  message: string
  description?: string
}
