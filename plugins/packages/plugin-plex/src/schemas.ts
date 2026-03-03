import { z } from 'zod'

export const StreamsQuerySchema = z.object({
  exclude: z.string().optional(),
})

export const RecentQuerySchema = z.object({
  exclude: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(10),
})

export const SearchQuerySchema = z.object({
  q: z.string().min(1),
  exclude: z.string().optional(),
})

export const MetadataParamsSchema = z.object({
  id: z.string().min(1),
})


// Stream type decision mapper
export function streamType(decision: string): string {
  switch (decision) {
    case 'transcode':
      return 'Transcode'
    case 'copy':
      return 'Direct Stream'
    case 'directplay':
      return 'Direct Play'
    default:
      return decision
  }
}