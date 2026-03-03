import type { PluginAPI } from '@organizrx/plugin-sdk'
import type { PlexVideo, PlexTrack, ResolvedPlexItem } from './types'
import { streamType } from './schemas'

// Configuration helper
export async function getPlexConfig(api: PluginAPI) {
  const [plexUrl, plexToken, machineId] = await Promise.all([
    api.settings.get('plex_url'),
    api.settings.get('plex_token'),
    api.settings.get('machine_identifier'),
  ])

  if (!plexUrl || !plexToken) {
    throw new Error('Plex URL and Token must be configured')
  }

  return { plexUrl, plexToken, machineId }
}

// Plex API request helper
export async function plexRequest(api: PluginAPI, endpoint: string): Promise<Response> {
  const { plexUrl, plexToken } = await getPlexConfig(api)
  const url = `${plexUrl}${endpoint}`
  const urlWithToken = url.includes('?')
    ? `${url}&X-Plex-Token=${plexToken}`
    : `${url}?X-Plex-Token=${plexToken}`

  api.logger.debug('Plex API request', { endpoint, url: urlWithToken })

  const response = await api.http.fetch(urlWithToken, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    api.logger.error('Plex API request failed', {
      endpoint,
      status: response.status,
      statusText: response.statusText,
    })
    throw new Error(`Plex API error: ${response.statusText}`)
  }

  return response
}

// Resolve Plex item to normalized format
export function resolvePlexItem(
  item: PlexVideo | PlexTrack,
  machineId: string | null
): ResolvedPlexItem {
  let resolvedItem: Partial<ResolvedPlexItem> = {
    originalType: item.type,
    uid: item.ratingKey,
    elapsed: item.viewOffset ? parseInt(item.viewOffset) : null,
    duration: item.duration
      ? parseInt(item.duration)
      : item.Media?.[0]?.duration
        ? parseInt(item.Media[0].duration)
        : 0,
    addedAt: item.addedAt ? parseInt(item.addedAt) : null,
    id: item.Player?.machineIdentifier?.replace(/"/g, '') || '',
    session: item.Session?.id || '',
    bandwidth: item.Session?.bandwidth || '',
    bandwidthType: item.Session?.location || '',
    sessionType: item.TranscodeSession?.progress ? 'Transcoding' : 'Direct Playing',
    state: item.Player?.state === 'paused' ? 'pause' : 'play',
    user: item.User?.title || '',
    userThumb: item.User?.thumb || '',
    userAddress: item.Player?.address || 'x.x.x.x',
    openTab: false,
    tabName: '',
  }

  // Type-specific field mapping
  switch (item.type) {
    case 'show': {
      const video = item as PlexVideo
      resolvedItem = {
        ...resolvedItem,
        type: 'tv',
        title: video.title,
        secondaryTitle: video.year || '',
        summary: video.summary || '',
        ratingKey: video.ratingKey,
        thumb: video.thumb || '',
        key: `${video.ratingKey}-list`,
        nowPlayingThumb: video.art || '',
        nowPlayingKey: `${video.ratingKey}-np`,
        nowPlayingTitle: video.title,
        nowPlayingBottom: video.year || '',
        metadataKey: video.ratingKey,
      }
      break
    }

    case 'season': {
      const video = item as PlexVideo
      resolvedItem = {
        ...resolvedItem,
        type: 'tv',
        title: video.parentTitle || '',
        secondaryTitle: video.title,
        summary: video.summary || '',
        ratingKey: video.parentRatingKey || video.ratingKey,
        thumb: video.thumb || '',
        key: `${video.ratingKey}-list`,
        nowPlayingThumb: video.art || '',
        nowPlayingKey: `${video.ratingKey}-np`,
        nowPlayingTitle: video.parentTitle || video.title,
        nowPlayingBottom: video.title,
        metadataKey: video.parentRatingKey || video.ratingKey,
      }
      break
    }

    case 'episode': {
      const video = item as PlexVideo
      resolvedItem = {
        ...resolvedItem,
        type: 'tv',
        title: video.grandparentTitle || '',
        secondaryTitle: `${video.parentTitle || ''} - Episode ${video.index || ''}`,
        summary: video.title,
        ratingKey: video.parentRatingKey || video.ratingKey,
        thumb: video.parentThumb || video.grandparentThumb || '',
        key: `${video.ratingKey}-list`,
        nowPlayingThumb: video.grandparentArt || '',
        nowPlayingKey: `${video.grandparentRatingKey || video.ratingKey}-np`,
        nowPlayingTitle: `${video.grandparentTitle || ''} - ${video.title}`,
        nowPlayingBottom: `S${video.parentIndex || ''} · E${video.index || ''}`,
        metadataKey: video.grandparentRatingKey || video.parentRatingKey || video.ratingKey,
      }
      break
    }

    case 'clip': {
      const video = item as PlexVideo
      const isLiveTV = video.live === true
      resolvedItem = {
        ...resolvedItem,
        type: 'clip',
        title: isLiveTV ? 'Live TV' : video.title,
        secondaryTitle: '',
        summary: video.summary || '',
        ratingKey: video.parentRatingKey || video.ratingKey,
        thumb: video.thumb || '',
        key: `${video.ratingKey}-list`,
        nowPlayingThumb: video.art || '',
        nowPlayingKey: isLiveTV ? 'livetv' : `${video.ratingKey}-np`,
        nowPlayingTitle: isLiveTV ? 'Live TV' : video.title,
        nowPlayingBottom: video.extraType ? 'Trailer' : isLiveTV ? 'Live TV' : '',
        metadataKey: video.ratingKey,
      }
      break
    }

    case 'album':
    case 'track': {
      const track = item as PlexTrack
      resolvedItem = {
        ...resolvedItem,
        type: 'music',
        title: track.parentTitle || '',
        secondaryTitle: track.title,
        summary: track.title,
        ratingKey: track.parentRatingKey || track.ratingKey,
        thumb: track.thumb || '',
        key: `${track.ratingKey}-list`,
        nowPlayingThumb: track.parentThumb || track.art || '',
        nowPlayingKey: `${track.parentRatingKey || track.ratingKey}-np`,
        nowPlayingTitle: `${track.grandparentTitle || ''} - ${track.title}`,
        nowPlayingBottom: track.parentTitle || '',
        metadataKey: track.grandparentRatingKey || track.parentRatingKey || track.ratingKey,
      }
      break
    }

    default: {
      // movie
      const video = item as PlexVideo
      resolvedItem = {
        ...resolvedItem,
        type: 'movie',
        title: video.title,
        secondaryTitle: video.year || '',
        summary: video.summary || '',
        ratingKey: video.ratingKey,
        thumb: video.thumb || '',
        key: `${video.ratingKey}-list`,
        nowPlayingThumb: video.art || '',
        nowPlayingKey: `${video.ratingKey}-np`,
        nowPlayingTitle: video.title,
        nowPlayingBottom: video.year || '',
        metadataKey: video.ratingKey,
      }
    }
  }

  // Calculate progress
  const watched =
    resolvedItem.elapsed && resolvedItem.duration
      ? Math.floor((resolvedItem.elapsed / resolvedItem.duration) * 100)
      : 0

  const transcoded = item.TranscodeSession?.progress
    ? Math.floor(parseInt(item.TranscodeSession.progress) - watched)
    : ''

  const stream = item.Media?.[0]?.Part?.[0]?.Stream?.[0]?.decision || ''

  // Build metadata address
  const plexWebUrl = machineId
    ? `https://app.plex.tv/desktop/#!/server/${machineId}/details?key=/library/metadata/${item.ratingKey}`
    : `https://app.plex.tv/web/app`

  // User stream info
  const userStream = {
    platform: item.Player?.platform || '',
    product: item.Player?.product || '',
    device: item.Player?.device || '',
    stream: item.Media?.[0]?.Part?.[0]
      ? `${item.Media[0].Part[0].decision || ''}${item.TranscodeSession?.throttled === '1' ? ' (Throttled)' : ''}`
      : '',
    videoResolution: item.Media?.[0]?.videoResolution || '',
    throttled: item.TranscodeSession?.throttled === '1',
    sourceVideoCodec: item.TranscodeSession?.sourceVideoCodec || '',
    videoCodec: item.TranscodeSession?.videoCodec || '',
    audioCodec: item.TranscodeSession?.audioCodec || '',
    sourceAudioCodec: item.TranscodeSession?.sourceAudioCodec || '',
    videoDecision: streamType(item.TranscodeSession?.videoDecision || ''),
    audioDecision: streamType(item.TranscodeSession?.audioDecision || ''),
    container: item.TranscodeSession?.container || '',
    audioChannels: item.TranscodeSession?.audioChannels || '',
  }

  // Extract genres
  const genres: string[] = []
  if ('Genre' in item && item.Genre) {
    for (const genre of item.Genre) {
      genres.push(genre.tag)
    }
  }

  // Extract actors
  const actors: { name: string; role: string; thumb: string }[] = []
  if ('Role' in item && item.Role) {
    for (const role of item.Role) {
      if (role.thumb) {
        actors.push({
          name: role.tag,
          role: role.role || '',
          thumb: role.thumb,
        })
      }
    }
  }

  // Metadata object
  const metadata = {
    guid: (item as PlexVideo).guid || '',
    summary: (item as PlexVideo).summary || (item as PlexTrack).summary || '',
    rating: (item as PlexVideo).rating || '',
    duration: item.duration || '',
    originallyAvailableAt: (item as PlexVideo).originallyAvailableAt || '',
    year: (item as PlexVideo).year || '',
    studio: (item as PlexVideo).studio || '',
    tagline: (item as PlexVideo).tagline || '',
    genres,
    actors,
  }

  // Image URLs (simplified - no caching in this version)
  const nowPlayingOriginalImage = `/api/plugins/plex/image?key=${resolvedItem.nowPlayingKey}`
  const originalImage = `/api/plugins/plex/image?key=${resolvedItem.key}`

  return {
    ...(resolvedItem as ResolvedPlexItem),
    watched,
    transcoded,
    stream,
    address: plexWebUrl,
    userStream,
    metadata,
    nowPlayingOriginalImage,
    originalImage,
    nowPlayingImageURL: nowPlayingOriginalImage,
    imageURL: originalImage,
  }
}
