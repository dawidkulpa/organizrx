/**
 * Zod validation schemas for auth types
 */

import { z } from 'zod'

export const jwtPayloadSchema = z.object({
  name: z.string().min(1),
  group: z.string().nullable(),
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
  group: z.string().nullable(),
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
  refreshToken: z.string(),
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
  refreshToken: z.string(),
})

export const logoutRequestSchema = z.object({
  refreshToken: z.string().optional(),
})
