import type { SabnzbdQueueData, SabnzbdHistoryData } from './types'

export class ApiClient {
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

  async getQueue(): Promise<SabnzbdQueueData> {
    return this.request<SabnzbdQueueData>('/queue')
  }

  async getHistory(): Promise<SabnzbdHistoryData> {
    return this.request<SabnzbdHistoryData>('/history')
  }

  async pause(): Promise<void> {
    await this.request('/pause', { method: 'POST' })
  }

  async resume(): Promise<void> {
    await this.request('/resume', { method: 'POST' })
  }

  async pauseItem(id: string): Promise<void> {
    await this.request(`/pause/${id}`, { method: 'POST' })
  }

  async resumeItem(id: string): Promise<void> {
    await this.request(`/resume/${id}`, { method: 'POST' })
  }
}
