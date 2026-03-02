// ============================================
// TYPES - EXPORTS
// ============================================

// Database types
export type {
  User,
  Group,
  Category,
  Tab,
  Token,
  Invite,
  BookmarkCategory,
  BookmarkTab,
  Settings,
  ChatMessage,
} from './types/db';

// Authentication types
export type {
  JWTPayload,
  LoginRequest,
  LoginResponse,
  AuthState,
  RefreshTokenRequest,
} from './types/auth';

// API types
export type {
  ApiError,
  ApiResponse,
  PaginationMeta,
  PaginatedResponse,
  GetUsersResponse,
  GetUserByIdResponse,
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  DeleteUserResponse,
  GetGroupsResponse,
  GetGroupByIdResponse,
  CreateGroupRequest,
  CreateGroupResponse,
  UpdateGroupRequest,
  UpdateGroupResponse,
  DeleteGroupResponse,
  GetCategoriesResponse,
  GetCategoryByIdResponse,
  CreateCategoryRequest,
  CreateCategoryResponse,
  UpdateCategoryRequest,
  UpdateCategoryResponse,
  DeleteCategoryResponse,
  GetTabsResponse,
  GetTabsByCategoryResponse,
  GetTabByIdResponse,
  CreateTabRequest,
  CreateTabResponse,
  UpdateTabRequest,
  UpdateTabResponse,
  DeleteTabResponse,
  GetTokensResponse,
  GetTokenByIdResponse,
  CreateTokenRequest,
  CreateTokenResponse,
  RevokeTokenResponse,
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
  GetSettingsResponse,
  GetSettingByNameResponse,
  UpdateSettingRequest,
  UpdateSettingResponse,
  HealthResponse,
  StatusResponse,
  PaginationQuery,
} from './types/api';

// Plugin types
export type {
  PluginManifest,
  PluginSetting,
  PluginConfig,
  PluginWidget,
  PluginAPI,
  PluginEntry,
  PluginRegistryEntry,
} from './types/plugin';
export { type PluginHook } from './types/plugin';

// ============================================
// VALIDATION SCHEMAS - EXPORTS
// ============================================

// Auth schemas
export {
  jwtPayloadSchema,
  loginRequestSchema,
  loginResponseSchema,
  authStateSchema,
  refreshTokenRequestSchema,
} from './schemas/auth';

// Database schemas
export {
  userSchema,
  groupSchema,
  categorySchema,
  tabSchema,
  tokenSchema,
  inviteSchema,
  bookmarkCategorySchema,
  bookmarkTabSchema,
  settingsSchema,
  chatMessageSchema,
} from './schemas/db';

// API schemas
export {
  paginationQuerySchema,
  paginationMetaSchema,
  createUserRequestSchema,
  updateUserRequestSchema,
  createGroupRequestSchema,
  updateGroupRequestSchema,
  createCategoryRequestSchema,
  updateCategoryRequestSchema,
  createTabRequestSchema,
  updateTabRequestSchema,
  createTokenRequestSchema,
  createInviteRequestSchema,
  useInviteRequestSchema,
  createBookmarkCategoryRequestSchema,
  createBookmarkTabRequestSchema,
  updateSettingRequestSchema,
} from './schemas/api';

// Plugin schemas
export {
  pluginSettingSchema,
  pluginManifestSchema,
  pluginConfigSchema,
  pluginWidgetSchema,
  pluginManifestUploadSchema,
  createPluginConfigSchema,
  updatePluginConfigSchema,
} from './schemas/plugin';

// ============================================
// CONSTANTS
// ============================================

export const API_BASE_URL = '/api';

// ============================================
// UTILITIES
// ============================================

/**
 * Health check response - used by status endpoint
 */
export interface HealthCheck {
  status: 'ok' | 'error';
}
