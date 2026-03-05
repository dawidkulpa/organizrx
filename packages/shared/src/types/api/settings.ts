/**
 * Settings request/response types
 */

// ============================================
// SETTINGS ENDPOINTS
// ============================================

export interface GetSettingsResponse {
  settings: Record<string, string | null>
}

export interface GetSettingByNameResponse {
  name: string
  value: string | null
}

export interface UpdateSettingRequest {
  value: string | null
}

export interface UpdateSettingResponse {
  name: string
  value: string | null
}
