/**
 * Zod validation schemas for plugin types
 */

import { z } from 'zod';

const iso8601DateTime = z.string().datetime();

export const pluginSettingSchema = z.object({
  key: z.string().min(1),
  type: z.enum(['text', 'number', 'boolean', 'select', 'textarea']),
  label: z.string().min(1),
  description: z.string().optional(),
  default: z.any().optional(),
  options: z
    .array(z.object({ label: z.string(), value: z.any() }))
    .optional(),
  required: z.boolean().optional(),
  validation: z
    .object({
      pattern: z.string().optional(),
      minLength: z.number().int().optional(),
      maxLength: z.number().int().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .optional(),
});

export const pluginManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().optional(),
  author: z.string().optional(),
  license: z.string().optional(),
  entry: z.string().optional(),
  settings: z.array(pluginSettingSchema).optional(),
  widgets: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  dependencies: z.record(z.string(), z.any()).optional(),
});

export const pluginConfigSchema = z.object({
  pluginId: z.string().min(1),
  enabled: z.boolean(),
  settings: z.record(z.string(), z.any()),
  createdAt: iso8601DateTime,
  updatedAt: iso8601DateTime,
});

export const pluginWidgetSchema = z.object({
  id: z.string().min(1),
  pluginId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  location: z.enum(['dashboard', 'sidebar', 'header', 'custom']).optional(),
  size: z
    .object({
      width: z.union([z.number(), z.string()]).optional(),
      height: z.union([z.number(), z.string()]).optional(),
    })
    .optional(),
  refreshInterval: z.number().int().optional(),
  config: z.record(z.string(), z.any()).optional(),
});

/**
 * Plugin manifest validation for user uploads
 */
export const pluginManifestUploadSchema = pluginManifestSchema;

/**
 * Plugin config validation
 */
export const createPluginConfigSchema = z.object({
  pluginId: z.string().min(1),
  enabled: z.boolean().default(true),
  settings: z.record(z.string(), z.any()).default({}),
});

export const updatePluginConfigSchema = z.object({
  enabled: z.boolean().optional(),
  settings: z.record(z.string(), z.any()).optional(),
});
