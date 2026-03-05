/**
 * Tab request/response types
 */

import type { Tab } from '../db'
import type { PaginatedResponse } from './common'

// ============================================
// TAB ENDPOINTS
// ============================================

export interface GetTabsResponse extends PaginatedResponse<Tab> {}

export interface GetTabsByCategoryResponse extends PaginatedResponse<Tab> {}

export interface GetTabByIdResponse {
  tab: Tab
}

export interface CreateTabRequest {
  name: string
  category_id: number
  url?: string
  url_local?: string
  group_id: number
  order?: number
  enabled?: number
  image?: string
  type?: number
  splash?: number
  ping?: number
  ping_url?: string
  timeout?: number
  timeout_ms?: number
  preload?: number
}

export interface CreateTabResponse {
  tab: Tab
}

export interface UpdateTabRequest {
  name?: string
  category_id?: number
  url?: string
  url_local?: string
  group_id?: number
  order?: number
  enabled?: number
  image?: string
  type?: number
  splash?: number
  ping?: number
  ping_url?: string
  timeout?: number
  timeout_ms?: number
  preload?: number
}

export interface UpdateTabResponse {
  tab: Tab
}

export interface DeleteTabResponse {
  success: boolean
}
