/**
 * User CRUD request/response types
 */

import type { User } from '../db'
import type { PaginatedResponse } from './common'

// ============================================
// USER ENDPOINTS
// ============================================

export interface GetUsersResponse extends PaginatedResponse<User> {}

export interface GetUserByIdResponse {
  user: User
}

export interface CreateUserRequest {
  username: string
  password: string
  email?: string
  groupName?: string
  group_id?: number
}

export interface CreateUserResponse {
  user: User
}

export interface UpdateUserRequest {
  username?: string
  password?: string
  email?: string
  groupName?: string
  group_id?: number
  image?: string
}

export interface UpdateUserResponse {
  user: User
}

export interface DeleteUserResponse {
  success: boolean
}
