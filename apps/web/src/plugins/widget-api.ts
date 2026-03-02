import { useAuthStore } from '../store'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PluginWidgetAPI {
  /** Plugin identifier this API is scoped to */
  pluginId: string
  /** Fetch a plugin-scoped API path. Prepends `/api/plugins/{pluginId}/`. */
  fetch(path: string, init?: RequestInit): Promise<Response>
  /** Fetch the plugin's configuration from the server. */
  getSettings(): Promise<Record<string, unknown>>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAuthHeaders(): HeadersInit {
  const token = useAuthStore.getState().token
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

function buildPluginUrl(pluginId: string, path: string): string {
  // Strip leading slash from path to avoid double-slash
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `/api/plugins/${pluginId}/${cleanPath}`
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a scoped API instance for a specific plugin widget.
 * All fetch calls are prefixed with `/api/plugins/{pluginId}/`
 * and include the auth token from the Zustand store.
 */
export function createWidgetAPI(pluginId: string): PluginWidgetAPI {
  return {
    pluginId,

    async fetch(path: string, init?: RequestInit): Promise<Response> {
      const url = buildPluginUrl(pluginId, path)
      const authHeaders = getAuthHeaders()

      const mergedHeaders: HeadersInit = {
        ...authHeaders,
        ...init?.headers,
      }

      return globalThis.fetch(url, {
        ...init,
        headers: mergedHeaders,
      })
    },

    async getSettings(): Promise<Record<string, unknown>> {
      const url = buildPluginUrl(pluginId, 'config')
      const authHeaders = getAuthHeaders()

      const response = await globalThis.fetch(url, {
        headers: authHeaders,
      })

      if (!response.ok) {
        throw new Error(
          `Failed to fetch plugin settings: ${response.status} ${response.statusText}`,
        )
      }

      const body = (await response.json()) as { data: Record<string, unknown> }
      return body.data
    },
  }
}
