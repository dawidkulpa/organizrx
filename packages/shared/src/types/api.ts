/**
 * API request and response types for all endpoints
 */

import type {
  User,
  Group,
  Tab,
  Category,
  Token,
  Invite,
  BookmarkCategory,
  BookmarkTab,
} from './db';

/**
 * Standard API error response
 */
export interface ApiError {
  code: string;
  message: string;
}

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

// ============================================
// USER ENDPOINTS
// ============================================

export interface GetUsersResponse extends PaginatedResponse<User> {}

export interface GetUserByIdResponse {
  user: User;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  email?: string;
  groupName?: string;
  group_id?: number;
}

export interface CreateUserResponse {
  user: User;
}

export interface UpdateUserRequest {
  username?: string;
  password?: string;
  email?: string;
  groupName?: string;
  group_id?: number;
  image?: string;
}

export interface UpdateUserResponse {
  user: User;
}

export interface DeleteUserResponse {
  success: boolean;
}

// ============================================
// GROUP ENDPOINTS
// ============================================

export interface GetGroupsResponse extends PaginatedResponse<Group> {}

export interface GetGroupByIdResponse {
  group: Group;
}

export interface CreateGroupRequest {
  name: string;
  group_id: number;
  image?: string;
  isDefault?: number;
}

export interface CreateGroupResponse {
  group: Group;
}

export interface UpdateGroupRequest {
  name?: string;
  group_id?: number;
  image?: string;
  isDefault?: number;
}

export interface UpdateGroupResponse {
  group: Group;
}

export interface DeleteGroupResponse {
  success: boolean;
}

// ============================================
// CATEGORY ENDPOINTS
// ============================================

export interface GetCategoriesResponse extends PaginatedResponse<Category> {}

export interface GetCategoryByIdResponse {
  category: Category;
}

export interface CreateCategoryRequest {
  name: string;
  category_id: number;
  order?: number;
  image?: string;
  isDefault?: number;
}

export interface CreateCategoryResponse {
  category: Category;
}

export interface UpdateCategoryRequest {
  name?: string;
  category_id?: number;
  order?: number;
  image?: string;
  isDefault?: number;
}

export interface UpdateCategoryResponse {
  category: Category;
}

export interface DeleteCategoryResponse {
  success: boolean;
}

// ============================================
// TAB ENDPOINTS
// ============================================

export interface GetTabsResponse extends PaginatedResponse<Tab> {}

export interface GetTabsByCategoryResponse extends PaginatedResponse<Tab> {}

export interface GetTabByIdResponse {
  tab: Tab;
}

export interface CreateTabRequest {
  name: string;
  category_id: number;
  url?: string;
  url_local?: string;
  group_id: number;
  order?: number;
  enabled?: number;
  image?: string;
  type?: number;
  splash?: number;
  ping?: number;
  ping_url?: string;
  timeout?: number;
  timeout_ms?: number;
  preload?: number;
}

export interface CreateTabResponse {
  tab: Tab;
}

export interface UpdateTabRequest {
  name?: string;
  category_id?: number;
  url?: string;
  url_local?: string;
  group_id?: number;
  order?: number;
  enabled?: number;
  image?: string;
  type?: number;
  splash?: number;
  ping?: number;
  ping_url?: string;
  timeout?: number;
  timeout_ms?: number;
  preload?: number;
}

export interface UpdateTabResponse {
  tab: Tab;
}

export interface DeleteTabResponse {
  success: boolean;
}

// ============================================
// TOKEN ENDPOINTS
// ============================================

export interface GetTokensResponse extends PaginatedResponse<Token> {}

export interface GetTokenByIdResponse {
  token: Token;
}

export interface CreateTokenRequest {
  user_id: number;
  browser?: string;
  ip?: string;
  expires?: string; // ISO datetime
}

export interface CreateTokenResponse {
  token: Token;
}

export interface RevokeTokenResponse {
  success: boolean;
}

// ============================================
// INVITE ENDPOINTS
// ============================================

export interface GetInvitesResponse extends PaginatedResponse<Invite> {}

export interface GetInviteByIdResponse {
  invite: Invite;
}

export interface CreateInviteRequest {
  email?: string;
  username?: string;
  type?: string;
}

export interface CreateInviteResponse {
  invite: Invite;
}

export interface UseInviteRequest {
  code: string;
  username: string;
  password: string;
  email?: string;
}

export interface UseInviteResponse {
  user: User;
  token: string;
}

export interface DeleteInviteResponse {
  success: boolean;
}

// ============================================
// BOOKMARK ENDPOINTS
// ============================================

export interface GetBookmarkCategoriesResponse extends PaginatedResponse<BookmarkCategory> {}

export interface CreateBookmarkCategoryRequest {
  name: string;
  category_id: number;
  order?: number;
  isDefault?: number;
}

export interface CreateBookmarkCategoryResponse {
  category: BookmarkCategory;
}

export interface GetBookmarkTabsResponse extends PaginatedResponse<BookmarkTab> {}

export interface CreateBookmarkTabRequest {
  name: string;
  url: string;
  category_id: number;
  group_id: number;
  order?: number;
  enabled?: number;
  image?: string;
  background_color?: string;
  text_color?: string;
}

export interface CreateBookmarkTabResponse {
  tab: BookmarkTab;
}

// ============================================
// SETTINGS ENDPOINTS
// ============================================

export interface GetSettingsResponse {
  settings: Record<string, string | null>;
}

export interface GetSettingByNameResponse {
  name: string;
  value: string | null;
}

export interface UpdateSettingRequest {
  value: string | null;
}

export interface UpdateSettingResponse {
  name: string;
  value: string | null;
}

// ============================================
// HEALTH & STATUS
// ============================================

export interface HealthResponse {
  status: 'ok' | 'error';
}

export interface StatusResponse {
  status: 'ok' | 'error';
  api_version: string;
  organizr_version: string;
}

// ============================================
// PAGINATION QUERY
// ============================================

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}
