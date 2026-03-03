import { useState, useEffect } from 'react'
import { RequestCard } from './request-card'

export interface OverseerrRequest {
  id: number
  status: number
  media: {
    tmdbId: number
    status: number
    posterPath?: string | null
  }
  type: 'movie' | 'tv'
  requestedBy: {
    username?: string | null
    plexUsername?: string | null
    displayName?: string
  }
  createdAt: string
}

interface OverseerrRequestsResponse {
  results: OverseerrRequest[]
  pageInfo: {
    pages: number
    pageSize: number
    results: number
    page: number
  }
}

interface WidgetProps {
  pluginId: string
  widgetId: string
  isAdmin?: boolean
}

export function OverseerrRequestsWidget({ pluginId, isAdmin = false }: WidgetProps) {
  const [requests, setRequests] = useState<OverseerrRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const apiBase = `/api/plugins/${pluginId}`

  // Fetch requests from the backend
  async function fetchRequests() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${apiBase}/requests?take=50&skip=0`)

      if (!response.ok) {
        throw new Error('Failed to fetch requests')
      }

      const result = await response.json()
      const data = result.data as OverseerrRequestsResponse

      // Filter to show only pending/unapproved requests
      const pendingRequests = data.results.filter(
        (req) => req.status === 1 && req.media.status !== 5
      )

      setRequests(pendingRequests)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Handle approve action
  async function handleApprove(requestId: number) {
    try {
      setActionLoading(requestId)

      const response = await fetch(`${apiBase}/requests/${requestId}/approve`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to approve request')
      }

      // Refresh the list after action
      await fetchRequests()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve request')
    } finally {
      setActionLoading(null)
    }
  }

  // Handle deny action
  async function handleDeny(requestId: number) {
    try {
      setActionLoading(requestId)

      const response = await fetch(`${apiBase}/requests/${requestId}/deny`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to deny request')
      }

      // Refresh the list after action
      await fetchRequests()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deny request')
    } finally {
      setActionLoading(null)
    }
  }

  // Load requests on mount
  useEffect(() => {
    fetchRequests()
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-t-blue-500 border-gray-300 rounded-full animate-spin" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading requests...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <svg
            className="w-12 h-12 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={fetchRequests}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Empty state
  if (requests.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-sm text-gray-600 dark:text-gray-400">No pending requests</p>
        </div>
      </div>
    )
  }

  // Main widget content
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pending Requests</h3>
        <span className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded-full">
          {requests.length}
        </span>
      </div>

      {/* Request list */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              isAdmin={isAdmin}
              actionLoading={actionLoading}
              onApprove={handleApprove}
              onDeny={handleDeny}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
