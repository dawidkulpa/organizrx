import { z } from 'zod'

export const tabSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  url: z.string().min(1, 'URL is required'),
  url_local: z.string().optional().nullable(),
  category_id: z
    .preprocess(
      (val) => (val === '' || val === null ? null : Number(val)),
      z.number().nullable().optional()
    )
    .optional(),
  group_id: z.coerce.number().min(0, 'Group is required'),
  type: z.coerce.number().min(0).max(2),
  image: z.string().optional().nullable(),
  custom_image_url: z.string().optional().nullable(),
  enabled: z.boolean().default(true),
  ping: z.boolean().default(false),
  ping_url: z.string().optional().nullable(),
  preload: z.boolean().default(false),
  splash: z.boolean().default(false),
  timeout: z.coerce.number().default(0),
  timeout_ms: z.coerce.number().default(0),
})

export type TabFormData = z.infer<typeof tabSchema>

export interface Tab {
  id: number
  name: string
  url: string
  url_local: string | null
  image: string | null
  category_id: number | null
  order: number
  group_id: number
  type: number
  enabled: number
  isDefault?: number | null
  splash: number | null
  ping: number | null
  ping_url: string | null
  preload: number | null
  timeout: number | null
  timeout_ms: number | null
}

export interface Category {
  id: number
  name: string
  order: number
  isDefault: number | null
  image: string | null
}

export interface Group {
  id: number
  name: string
  group_id: number
  image: string | null
  isDefault: number | null
}
