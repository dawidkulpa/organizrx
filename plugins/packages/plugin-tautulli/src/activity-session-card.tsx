import type { TautulliSession } from './types'
import { formatBandwidth } from './format-utils'
import { getMediaTitle, getTranscodeIcon } from './helpers'

interface ActivitySessionCardProps {
  session: TautulliSession
}

export function ActivitySessionCard({ session }: ActivitySessionCardProps) {
  return (
    <div key={session.session_key} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {session.thumb ? (
            <img
              src={session.thumb}
              alt={session.title}
              className="w-16 h-24 object-cover rounded"
            />
          ) : (
            <div className="w-16 h-24 bg-gray-700 rounded flex items-center justify-center text-gray-500 text-2xl">
              {session.media_type === 'movie'
                ? '🎬'
                : session.media_type === 'episode'
                  ? '📺'
                  : '🎵'}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{getMediaTitle(session)}</div>
          <div className="text-sm text-gray-400 mt-1">{session.friendly_name || session.user}</div>

          <div className="flex flex-wrap gap-2 mt-2 text-xs">
            <span className="px-2 py-1 bg-gray-700 rounded">
              {getTranscodeIcon(session.transcode_decision)} {session.transcode_decision}
            </span>
            <span className="px-2 py-1 bg-gray-700 rounded">{session.product}</span>
            <span className="px-2 py-1 bg-gray-700 rounded">{session.video_resolution}</span>
            <span className="px-2 py-1 bg-gray-700 rounded">
              {formatBandwidth(session.bandwidth)}
            </span>
          </div>

          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>{session.state === 'playing' ? '▶️ Playing' : '⏸️ Paused'}</span>
              <span>{session.progress_percent}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1">
              <div
                className="bg-blue-600 h-1 rounded-full transition-all"
                style={{ width: `${session.progress_percent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
