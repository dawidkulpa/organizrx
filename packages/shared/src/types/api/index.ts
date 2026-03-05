/**
 * Barrel re-export — all API request/response types
 */

// Common types (pagination, envelopes, health/status)
export type {
  ApiError,
  ApiResponse,
  PaginationMeta,
  PaginatedResponse,
  PaginationQuery,
  HealthResponse,
  StatusResponse,
} from './common'

// Auth/Token types
export type {
  GetTokensResponse,
  GetTokenByIdResponse,
  CreateTokenRequest,
  CreateTokenResponse,
  RevokeTokenResponse,
} from './auth'

// User types
export type {
  GetUsersResponse,
  GetUserByIdResponse,
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  DeleteUserResponse,
} from './users'

// Group types
export type {
  GetGroupsResponse,
  GetGroupByIdResponse,
  CreateGroupRequest,
  CreateGroupResponse,
  UpdateGroupRequest,
  UpdateGroupResponse,
  DeleteGroupResponse,
} from './groups'

// Category types
export type {
  GetCategoriesResponse,
  GetCategoryByIdResponse,
  CreateCategoryRequest,
  CreateCategoryResponse,
  UpdateCategoryRequest,
  UpdateCategoryResponse,
  DeleteCategoryResponse,
} from './categories'

// Tab types
export type {
  GetTabsResponse,
  GetTabsByCategoryResponse,
  GetTabByIdResponse,
  CreateTabRequest,
  CreateTabResponse,
  UpdateTabRequest,
  UpdateTabResponse,
  DeleteTabResponse,
} from './tabs'

// Settings types
export type {
  GetSettingsResponse,
  GetSettingByNameResponse,
  UpdateSettingRequest,
  UpdateSettingResponse,
} from './settings'

// Plugin/Invite/Bookmark types
export type {
  GetInvitesResponse,
  GetInviteByIdResponse,
  CreateInviteRequest,
  CreateInviteResponse,
  UseInviteRequest,
  UseInviteResponse,
  DeleteInviteResponse,
  GetBookmarkCategoriesResponse,
  CreateBookmarkCategoryRequest,
  CreateBookmarkCategoryResponse,
  GetBookmarkTabsResponse,
  CreateBookmarkTabRequest,
  CreateBookmarkTabResponse,
} from './plugins'
