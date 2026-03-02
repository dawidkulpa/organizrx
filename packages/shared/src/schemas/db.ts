/**
 * Zod validation schemas for database types
 */

import { z } from 'zod';

const iso8601DateTime = z.string().datetime();
const nullableBooleanAsInt = z.union([z.literal(0), z.literal(1)]).nullable();

export const userSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  password: z.string(),
  email: z.string().nullable(),
  plex_token: z.string().nullable(),
  group: z.string().nullable(),
  group_id: z.number().int().nullable(),
  locked: z.number().int().nullable(),
  image: z.string().nullable(),
  register_date: iso8601DateTime,
  auth_service: z.string().default('internal'),
});

export const groupSchema = z.object({
  id: z.number().int(),
  group: z.string(),
  group_id: z.number().int(),
  image: z.string().nullable(),
  default: nullableBooleanAsInt,
});

export const categorySchema = z.object({
  id: z.number().int(),
  order: z.number().int().nullable(),
  category: z.string(),
  category_id: z.number().int(),
  image: z.string().nullable(),
  default: nullableBooleanAsInt,
});

export const tabSchema = z.object({
  id: z.number().int(),
  order: z.number().int().nullable(),
  category_id: z.number().int(),
  name: z.string(),
  url: z.string().nullable(),
  url_local: z.string().nullable(),
  default: nullableBooleanAsInt,
  enabled: nullableBooleanAsInt,
  group_id: z.number().int(),
  group_id_max: z.number().int().default(0),
  add_to_admin: z.number().int().default(0),
  image: z.string().nullable(),
  type: z.number().int().nullable(),
  splash: nullableBooleanAsInt,
  ping: nullableBooleanAsInt,
  ping_url: z.string().nullable(),
  timeout: z.number().int().nullable(),
  timeout_ms: z.number().int().nullable(),
  preload: nullableBooleanAsInt,
});

export const tokenSchema = z.object({
  id: z.number().int(),
  token: z.string(),
  user_id: z.number().int(),
  browser: z.string().nullable(),
  ip: z.string().nullable(),
  created: iso8601DateTime,
  expires: iso8601DateTime,
});

export const inviteSchema = z.object({
  id: z.number().int(),
  code: z.string(),
  date: iso8601DateTime,
  email: z.string().nullable(),
  username: z.string().nullable(),
  dateused: iso8601DateTime.nullable(),
  usedby: z.string().nullable(),
  ip: z.string().nullable(),
  valid: z.string(),
  type: z.string().nullable(),
  invitedby: z.string().nullable(),
});

export const bookmarkCategorySchema = z.object({
  id: z.number().int(),
  order: z.number().int().nullable(),
  category: z.string(),
  category_id: z.number().int(),
  default: nullableBooleanAsInt,
});

export const bookmarkTabSchema = z.object({
  id: z.number().int(),
  order: z.number().int().nullable(),
  category_id: z.number().int(),
  name: z.string(),
  url: z.string(),
  enabled: nullableBooleanAsInt,
  group_id: z.number().int(),
  image: z.string().nullable(),
  background_color: z.string().nullable(),
  text_color: z.string().nullable(),
});

export const settingsSchema = z.object({
  id: z.number().int().optional(),
  name: z.string(),
  value: z.string().nullable(),
});

export const chatMessageSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  gravatar: z.string().nullable(),
  uid: z.string(),
  date: iso8601DateTime,
  ip: z.string().nullable(),
  message: z.string(),
});
