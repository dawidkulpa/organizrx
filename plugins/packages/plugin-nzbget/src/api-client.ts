import type { QueueData, HistoryData } from './widget-types'

class ApiClient {
  constructor(private pluginId: string) {}

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`/api/plugins/${this.pluginId}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = (await response
        .json()
        .catch(() => ({ error: { message: response.statusText } }))) as {
        error?: { message: string }
      }
      throw new Error(error.error?.message || 'Request failed')
    }

    const result = (await response.json()) as { data: T }
    return result.data
  }

  async getQueue(): Promise<QueueData> {
    return this.request<QueueData>('/queue')
  }

  async getHistory(): Promise<HistoryData> {
    return this.request<HistoryData>('/history')
  }

  async pause(nzbId: number): Promise<void> {
    await this.request('/pause', {
      method: 'POST',
      body: JSON.stringify({ nzbId }),
    })
  }

  async resume(nzbId: number): Promise<void> {
    await this.request('/resume', {
      method: 'POST',
      body: JSON.stringify({ nzbId }),
    })
  }
}

export default ApiClient
