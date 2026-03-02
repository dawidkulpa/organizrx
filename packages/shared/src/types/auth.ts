/**
 * Authentication and JWT types
 */

/**
 * JWT payload claims — matches legacy Organizr token structure
 */
export interface JWTPayload {
  name: string // username
  group: string | null
  groupID: number | null // numeric group id
  userID: number // numeric user id
  email: string | null
  image: string | null
  iat?: number // issued at
  exp?: number // expiration time
}

/**
 * User info returned in auth responses (password excluded)
 */
export interface AuthUser {
  id: number
  username: string
  email: string | null
  group: string | null
  group_id: number | null
  image: string | null
}

/**
 * Login request
 */
export interface LoginRequest {
  username: string
  password: string
  rememberMe?: boolean
}

/**
 * Login response — access + refresh token pair
 */
export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

/**
 * Current authentication state
 */
export interface AuthState {
  isAuthenticated: boolean
  user: AuthUser | null
  token: string | null
}

/**
 * Refresh token request
 */
export interface RefreshTokenRequest {
  refreshToken: string
}

/**
 * Refresh token response
 */
export interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
}

/**
 * Logout request — optionally revoke specific refresh token
 */
export interface LogoutRequest {
  refreshToken?: string
}
