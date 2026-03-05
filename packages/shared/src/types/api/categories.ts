/**
 * Category request/response types
 */

import type { Category } from '../db'
import type { PaginatedResponse } from './common'

// ============================================
// CATEGORY ENDPOINTS
// ============================================

export interface GetCategoriesResponse extends PaginatedResponse<Category> {}

export interface GetCategoryByIdResponse {
  category: Category
}

export interface CreateCategoryRequest {
  name: string
  category_id: number
  order?: number
  image?: string
  isDefault?: number
}

export interface CreateCategoryResponse {
  category: Category
}

export interface UpdateCategoryRequest {
  name?: string
  category_id?: number
  order?: number
  image?: string
  isDefault?: number
}

export interface UpdateCategoryResponse {
  category: Category
}

export interface DeleteCategoryResponse {
  success: boolean
}
