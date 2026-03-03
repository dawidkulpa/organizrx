/**
 * Zod validation schemas for auth types
 */

import { z } from 'zod'

export const jwtPayloadSchema = z.object({
  name: z.string().min(1),
  groupName: z.string().nullable(),
  groupID: z.number().int().nullable(),
  userID: z.number().int(),
  email: z.string().email().nullable(),
  image: z.string().nullable(),
  iat: z.number().int().optional(),
  exp: z.number().int().optional(),
})

export const authUserSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  email: z.string().nullable(),
  groupName: z.string().nullable(),
  group_id: z.number().int().nullable(),
  image: z.string().nullable(),
})

export const loginRequestSchema = z.object({
  username: z.string().min(1).max(255),
  password: z.string().min(1).max(255),
  rememberMe: z.boolean().optional(),
})

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: authUserSchema,
})

export const authStateSchema = z.object({
  isAuthenticated: z.boolean(),
  user: authUserSchema.nullable(),
  token: z.string().nullable(),
})

export const refreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1),
})

export const refreshTokenResponseSchema = z.object({
  accessToken: z.string(),
})

export const logoutRequestSchema = z.object({
  refreshToken: z.string().optional(),
})

export const setupTwoFactorRequestSchema = z.object({})

export const setupTwoFactorResponseSchema = z.object({
  secret: z.string(),
  qrUri: z.string(),
  backupCodes: z.array(z.string()),
})

export const verifySetupTwoFactorRequestSchema = z.object({
  secret: z.string().min(1),
  token: z.string().length(6),
})

export const verifySetupTwoFactorResponseSchema = z.object({
  success: z.boolean(),
})

export const verifyTwoFactorRequestSchema = z.object({
  temp_token: z.string().min(1),
  totp_code: z.string().length(6).optional(),
  backup_code: z.string().optional(),
})

export const verifyTwoFactorResponseSchema = z.object({
  accessToken: z.string(),
  user: authUserSchema,
})

export const disableTwoFactorRequestSchema = z.object({
  password: z.string().min(1),
})

export const disableTwoFactorResponseSchema = z.object({
  success: z.boolean(),
})
