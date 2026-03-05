/**
 * Group request/response types
 */

import type { Group } from '../db'
import type { PaginatedResponse } from './common'

// ============================================
// GROUP ENDPOINTS
// ============================================

export interface GetGroupsResponse extends PaginatedResponse<Group> {}

export interface GetGroupByIdResponse {
  group: Group
}

export interface CreateGroupRequest {
  name: string
  group_id: number
  image?: string
  isDefault?: number
}

export interface CreateGroupResponse {
  group: Group
}

export interface UpdateGroupRequest {
  name?: string
  group_id?: number
  image?: string
  isDefault?: number
}

export interface UpdateGroupResponse {
  group: Group
}

export interface DeleteGroupResponse {
  success: boolean
}
