/**
 * Plugin request/response types — reserved for future plugin API types
 *
 * Note: Core plugin types (PluginManifest, PluginConfig, etc.) live in
 * types/plugin.ts. This file is a placeholder for plugin-specific API
 * endpoint request/response types as they are added.
 */

import type { Invite, User, BookmarkCategory, BookmarkTab } from '../db'
import type { PaginatedResponse } from './common'

// ============================================
// INVITE ENDPOINTS
// ============================================

export interface GetInvitesResponse extends PaginatedResponse<Invite> {}

export interface GetInviteByIdResponse {
  invite: Invite
}

export interface CreateInviteRequest {
  email?: string
  username?: string
  type?: string
}

export interface CreateInviteResponse {
  invite: Invite
}

export interface UseInviteRequest {
  code: string
  username: string
  password: string
  email?: string
}

export interface UseInviteResponse {
  user: User
  token: string
}

export interface DeleteInviteResponse {
  success: boolean
}

// ============================================
// BOOKMARK ENDPOINTS
// ============================================

export interface GetBookmarkCategoriesResponse extends PaginatedResponse<BookmarkCategory> {}

export interface CreateBookmarkCategoryRequest {
  name: string
  category_id: number
  order?: number
  isDefault?: number
}

export interface CreateBookmarkCategoryResponse {
  category: BookmarkCategory
}

export interface GetBookmarkTabsResponse extends PaginatedResponse<BookmarkTab> {}

export interface CreateBookmarkTabRequest {
  name: string
  url: string
  category_id: number
  group_id: number
  order?: number
  enabled?: number
  image?: string
  background_color?: string
  text_color?: string
}

export interface CreateBookmarkTabResponse {
  tab: BookmarkTab
}
