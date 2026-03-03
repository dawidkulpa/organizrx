import type { PluginAPI } from '@organizrx/plugin-sdk'
import { jsonRpc } from './json-rpc'
import type { NzbGetGroup, NzbGetHistoryItem } from './api-types'

export class NzbGetClient {
  constructor(
    private api: PluginAPI,
    private baseUrl: string,
    private username: string,
    private password: string
  ) {}

  async listGroups(): Promise<NzbGetGroup[]> {
    return jsonRpc<NzbGetGroup[]>(
      this.api,
      this.baseUrl,
      this.username,
      this.password,
      'listgroups'
    )
  }

  async getHistory(): Promise<NzbGetHistoryItem[]> {
    return jsonRpc<NzbGetHistoryItem[]>(
      this.api,
      this.baseUrl,
      this.username,
      this.password,
      'history'
    )
  }

  async pauseDownload(nzbId: number): Promise<boolean> {
    return jsonRpc<boolean>(this.api, this.baseUrl, this.username, this.password, 'pausedownload', [
      nzbId,
    ])
  }

  async resumeDownload(nzbId: number): Promise<boolean> {
    return jsonRpc<boolean>(
      this.api,
      this.baseUrl,
      this.username,
      this.password,
      'resumedownload',
      [nzbId]
    )
  }

  async pausePost(): Promise<boolean> {
    return jsonRpc<boolean>(this.api, this.baseUrl, this.username, this.password, 'pausepost')
  }

  async resumePost(): Promise<boolean> {
    return jsonRpc<boolean>(this.api, this.baseUrl, this.username, this.password, 'resumepost')
  }
}
