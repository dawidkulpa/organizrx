/**
 * Zod validation schemas for auth types
 */

import { z } from 'zod';

export const jwtPayloadSchema = z.object({
  name: z.string().min(1),
  group: z.string().nullable(),
  groupID: z.number().int().nullable(),
  userID: z.number().int(),
  email: z.string().email().nullable(),
  image: z.string().nullable(),
  iat: z.number().int().optional(),
  exp: z.number().int().optional(),
});

export const loginRequestSchema = z.object({
  username: z.string().min(1).max(255),
  password: z.string().min(1).max(255),
});

export const loginResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.number().int(),
    username: z.string(),
    email: z.string().nullable(),
    group: z.string().nullable(),
    group_id: z.number().int().nullable(),
    image: z.string().nullable(),
  }),
});

export const authStateSchema = z.object({
  isAuthenticated: z.boolean(),
  user: z
    .object({
      id: z.number().int(),
      username: z.string(),
      email: z.string().nullable(),
      group: z.string().nullable(),
      group_id: z.number().int().nullable(),
      image: z.string().nullable(),
    })
    .nullable(),
  token: z.string().nullable(),
});

export const refreshTokenRequestSchema = z.object({
  token: z.string().min(1),
});
