/**
 * Shared/common API types — pagination, envelopes, health/status
 */

/**
 * Standard API error response
 */
export interface ApiError {
  code: string
  message: string
}

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  pages: number
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[]
  meta: PaginationMeta
}

/**
 * Pagination query parameters
 */
export interface PaginationQuery {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: 'ok' | 'error'
}

/**
 * Status response
 */
export interface StatusResponse {
  status: 'ok' | 'error'
  api_version: string
  organizr_version: string
}
