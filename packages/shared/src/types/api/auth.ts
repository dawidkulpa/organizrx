/**
 * Auth-related request/response types
 *
 * Note: Primary auth types (LoginRequest, LoginResponse, etc.) live in
 * types/auth.ts. Token endpoint types are placed here as they relate to the
 * API resource layer.
 */

import type { Token } from '../db'
import type { PaginatedResponse } from './common'

// ============================================
// TOKEN ENDPOINTS
// ============================================

export interface GetTokensResponse extends PaginatedResponse<Token> {}

export interface GetTokenByIdResponse {
  token: Token
}

export interface CreateTokenRequest {
  user_id: number
  browser?: string
  ip?: string
  expires?: string // ISO datetime
}

export interface CreateTokenResponse {
  token: Token
}

export interface RevokeTokenResponse {
  success: boolean
}
