// Shared utilities for Jellyfin/Emby plugins
import type {
  MediaType,
  PlayMethod,
  ImageType,
  SessionInfo,
  MediaItem,
  PersonInfo,
  NormalizedSession,
  NormalizedMediaItem,
} from './types'

export function buildAuthHeaders(apiKey: string): Record<string, string> {
  return {
    'X-Emby-Token': apiKey,
    Authorization: `MediaBrowser Token="${apiKey}"`,
  }
}

export function buildImageUrl(
  baseUrl: string,
  itemId: string,
  imageType: ImageType,
  params?: { width?: number; height?: number; quality?: number }
): string {
  const url = new URL(`${baseUrl}/Items/${itemId}/Images/${imageType}`)
  if (params?.width) url.searchParams.set('maxWidth', String(params.width))
  if (params?.height) url.searchParams.set('maxHeight', String(params.height))
  if (params?.quality) url.searchParams.set('quality', String(params.quality))
  return url.toString()
}

export function ticksToSeconds(ticks: number | undefined): number {
  if (!ticks) return 0
  return Math.floor(ticks / 10000000)
}

export function calculateProgress(position?: number, duration?: number): number {
  if (!position || !duration || duration === 0) return 0
  return Math.floor((position / duration) * 100)
}

export function normalizeMediaType(type: string): MediaType {
  switch (type) {
    case 'Movie':
      return 'movie'
    case 'Series':
    case 'Episode':
      return 'tv'
    case 'Audio':
    case 'MusicAlbum':
      return 'music'
    case 'Video':
    default:
      return 'video'
  }
}

export function getDisplayTitle(item: MediaItem): string {
  switch (item.Type) {
    case 'Episode':
      return item.SeriesName || item.Name
    case 'Audio':
      return item.Name
    default:
      return item.Name
  }
}

export function getSecondaryTitle(item: MediaItem): string {
  switch (item.Type) {
    case 'Episode':
      return item.Name
    case 'Audio':
      return item.Album || ''
    default:
      return ''
  }
}

export function getPosterImageId(item: MediaItem): string | null {
  switch (item.Type) {
    case 'Episode':
      return item.SeriesId || item.Id
    case 'Audio':
      return item.AlbumId || item.Id
    default:
      return item.Id
  }
}

export function getBackdropImageId(item: MediaItem): string | null {
  if (item.Type === 'Episode') {
    return item.ParentBackdropItemId || item.ParentThumbItemId || null
  }
  return item.Id
}

export function getBestImageType(item: MediaItem, preferredType: 'poster' | 'backdrop'): ImageType {
  if (preferredType === 'backdrop') {
    if (item.BackdropImageTags && item.BackdropImageTags.length > 0) return 'Backdrop'
    if (item.ParentBackdropImageTags && item.ParentBackdropImageTags.length > 0) return 'Backdrop'
    if (item.ImageTags?.Thumb) return 'Thumb'
  }
  if (item.ImageTags?.Primary) return 'Primary'
  if (item.ImageTags?.Thumb) return 'Thumb'
  if (item.BackdropImageTags && item.BackdropImageTags.length > 0) return 'Backdrop'
  return 'Primary'
}

export function normalizeSession(session: SessionInfo, baseUrl: string): NormalizedSession | null {
  if (!session.NowPlayingItem) return null

  const item = session.NowPlayingItem
  const type = normalizeMediaType(item.Type)
  const title = getDisplayTitle(item)
  const secondaryTitle = getSecondaryTitle(item)
  const posterId = getPosterImageId(item)
  const backdropId = getBackdropImageId(item)
  const imageType = getBestImageType(item, 'poster')
  const backdropImageType = getBestImageType(item, 'backdrop')

  return {
    uid: item.Id,
    serverId: item.ServerId,
    sessionId: session.Id,
    user: session.UserName || '',
    type,
    title,
    secondaryTitle,
    year: item.ProductionYear,
    posterUrl: posterId
      ? buildImageUrl(baseUrl, posterId, imageType, { width: 300, height: 450 })
      : '',
    backdropUrl: backdropId
      ? buildImageUrl(baseUrl, backdropId, backdropImageType, { width: 1920, height: 1080 })
      : '',
    state: session.PlayState?.IsPaused ? 'pause' : 'play',
    progress: calculateProgress(session.PlayState?.PositionTicks, item.RunTimeTicks),
    duration: ticksToSeconds(item.RunTimeTicks),
    transcodeProgress: session.TranscodingInfo?.CompletionPercentage || 100,
    streamMethod: (session.PlayState?.PlayMethod as PlayMethod) || null,
    client: session.Client || 'Unknown',
    device: session.DeviceName || 'Unknown',
    address: session.RemoteEndPoint || 'unknown',
    bandwidth: session.TranscodingInfo?.Bitrate
      ? Math.floor(session.TranscodingInfo.Bitrate / 1000)
      : undefined,
    videoCodec: session.TranscodingInfo?.VideoCodec,
    audioCodec: session.TranscodingInfo?.AudioCodec,
    container: item.Container,
  }
}

export function normalizeMediaItem(item: MediaItem, baseUrl: string): NormalizedMediaItem | null {
  const type = normalizeMediaType(item.Type)
  const title = getDisplayTitle(item)
  const secondaryTitle = getSecondaryTitle(item)
  const posterId = getPosterImageId(item)
  const backdropId = getBackdropImageId(item)
  const imageType = getBestImageType(item, 'poster')
  const backdropImageType = getBestImageType(item, 'backdrop')

  return {
    uid: item.Id,
    serverId: item.ServerId,
    type,
    title,
    secondaryTitle,
    year: item.ProductionYear,
    posterUrl: posterId
      ? buildImageUrl(baseUrl, posterId, imageType, { width: 300, height: 450 })
      : '',
    backdropUrl: backdropId
      ? buildImageUrl(baseUrl, backdropId, backdropImageType, { width: 1920, height: 1080 })
      : '',
    summary: item.Overview,
    rating: item.CommunityRating,
    genres: item.Genres,
    actors:
      item.People?.filter((p) => p.Role && p.PrimaryImageTag).map((p) => ({
        name: p.Name,
        role: p.Role!,
        thumb: buildImageUrl(baseUrl, p.Id, 'Primary', { width: 300, height: 450 }),
      })) || [],
  }
}
