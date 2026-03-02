/**
 * Zod validation schemas for API request/response types
 */

import { z } from 'zod';

// ============================================
// PAGINATION
// ============================================

export const paginationQuerySchema = z.object({
  page: z.number().int().min(1).default(1).optional(),
  limit: z.number().int().min(1).max(100).default(20).optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc').optional(),
});

export const paginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  pages: z.number().int(),
});

// ============================================
// USER REQUESTS
// ============================================

export const createUserRequestSchema = z.object({
  username: z.string().min(1).max(255),
  password: z.string().min(1).max(255),
  email: z.string().email().optional(),
  group: z.string().optional(),
  group_id: z.number().int().optional(),
});

export const updateUserRequestSchema = z.object({
  username: z.string().min(1).max(255).optional(),
  password: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  group: z.string().optional(),
  group_id: z.number().int().optional(),
  image: z.string().optional(),
});

// ============================================
// GROUP REQUESTS
// ============================================

export const createGroupRequestSchema = z.object({
  group: z.string().min(1).max(255),
  group_id: z.number().int(),
  image: z.string().optional(),
  default: z.number().int().optional(),
});

export const updateGroupRequestSchema = z.object({
  group: z.string().min(1).max(255).optional(),
  group_id: z.number().int().optional(),
  image: z.string().optional(),
  default: z.number().int().optional(),
});

// ============================================
// CATEGORY REQUESTS
// ============================================

export const createCategoryRequestSchema = z.object({
  category: z.string().min(1).max(255),
  category_id: z.number().int(),
  order: z.number().int().optional(),
  image: z.string().optional(),
  default: z.number().int().optional(),
});

export const updateCategoryRequestSchema = z.object({
  category: z.string().min(1).max(255).optional(),
  category_id: z.number().int().optional(),
  order: z.number().int().optional(),
  image: z.string().optional(),
  default: z.number().int().optional(),
});

// ============================================
// TAB REQUESTS
// ============================================

export const createTabRequestSchema = z.object({
  name: z.string().min(1).max(255),
  category_id: z.number().int(),
  url: z.string().url().optional(),
  url_local: z.string().optional(),
  group_id: z.number().int(),
  order: z.number().int().optional(),
  enabled: z.number().int().optional(),
  image: z.string().optional(),
  type: z.number().int().optional(),
  splash: z.number().int().optional(),
  ping: z.number().int().optional(),
  ping_url: z.string().optional(),
  timeout: z.number().int().optional(),
  timeout_ms: z.number().int().optional(),
  preload: z.number().int().optional(),
});

export const updateTabRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  category_id: z.number().int().optional(),
  url: z.string().url().optional(),
  url_local: z.string().optional(),
  group_id: z.number().int().optional(),
  order: z.number().int().optional(),
  enabled: z.number().int().optional(),
  image: z.string().optional(),
  type: z.number().int().optional(),
  splash: z.number().int().optional(),
  ping: z.number().int().optional(),
  ping_url: z.string().optional(),
  timeout: z.number().int().optional(),
  timeout_ms: z.number().int().optional(),
  preload: z.number().int().optional(),
});

// ============================================
// TOKEN REQUESTS
// ============================================

export const createTokenRequestSchema = z.object({
  user_id: z.number().int(),
  browser: z.string().optional(),
  ip: z.string().optional(),
  expires: z.string().datetime().optional(),
});

// ============================================
// INVITE REQUESTS
// ============================================

export const createInviteRequestSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().optional(),
  type: z.string().optional(),
});

export const useInviteRequestSchema = z.object({
  code: z.string().min(1),
  username: z.string().min(1).max(255),
  password: z.string().min(1).max(255),
  email: z.string().email().optional(),
});

// ============================================
// BOOKMARK REQUESTS
// ============================================

export const createBookmarkCategoryRequestSchema = z.object({
  category: z.string().min(1).max(255),
  category_id: z.number().int(),
  order: z.number().int().optional(),
  default: z.number().int().optional(),
});

export const createBookmarkTabRequestSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url(),
  category_id: z.number().int(),
  group_id: z.number().int(),
  order: z.number().int().optional(),
  enabled: z.number().int().optional(),
  image: z.string().optional(),
  background_color: z.string().optional(),
  text_color: z.string().optional(),
});

// ============================================
// SETTINGS REQUESTS
// ============================================

export const updateSettingRequestSchema = z.object({
  value: z.string().nullable(),
});
