// NZBGet API Types

export interface JsonRpcRequest {
  method: string
  params: unknown[]
}

export interface JsonRpcResponse<T = unknown> {
  version: string
  result: T
}

export interface NzbGetGroup {
  NZBID: number
  NZBName: string
  RemainingSizeMB: number
  FileSizeMB: number
  Status: string
  MinPostTime: number
  MaxPostTime: number
  Category: string
  DownloadedSizeMB: number
  DownloadRate: number
  FileCount: number
  RemainingFileCount: number
}

export interface NzbGetHistoryItem {
  NZBID: number
  Name: string
  Category: string
  Status: string
  DownloadedSizeMB: number
  DownloadTimeSec: number
  HistoryTime: number
  FileSizeMB: number
  ParStatus: string
  UnpackStatus: string
  DeleteStatus: string
  ScriptStatus: string
  FailedArticles: number
}

export interface QueueResponse {
  groups: NzbGetGroup[]
  totalSizeMB: number
  remainingSizeMB: number
  downloadRate: number
  activeCount: number
}

export interface HistoryResponse {
  items: NzbGetHistoryItem[]
  totalCount: number
}
