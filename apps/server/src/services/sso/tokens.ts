import { eq } from 'drizzle-orm'

import { dialectCtx } from '../../db/dialect-ctx'
import { getSettingString } from '../settings'

// ---------------------------------------------------------------------------
// Token retrieval
// ---------------------------------------------------------------------------

export async function getUserToken(userId: number, tokenSource: string): Promise<string | null> {
  const ctx = dialectCtx('users')

  // Special case: plex_token is stored in user record
  if (tokenSource === 'plex_token') {
    let rows: unknown[]

    if (ctx.dialect === 'sqlite') {
      rows = ctx.db
        .select({ plex_token: ctx.users.plex_token })
        .from(ctx.users)
        .where(eq(ctx.users.id, userId))
        .all()
    } else if (ctx.dialect === 'mysql') {
      rows = await ctx.db
        .select({ plex_token: ctx.users.plex_token })
        .from(ctx.users)
        .where(eq(ctx.users.id, userId))
    } else {
      rows = await ctx.db
        .select({ plex_token: ctx.users.plex_token })
        .from(ctx.users)
        .where(eq(ctx.users.id, userId))
    }

    if (rows.length === 0) return null
    const row = rows[0] as { plex_token: string | null }
    return row.plex_token
  }

  // For other services, tokens are stored in settings table
  // Format: sso_{service}_token or user-specific: sso_{service}_token_{userId}
  const userSpecificKey = `sso_${tokenSource.replace('_token', '')}_token_${userId}`
  const globalKey = `sso_${tokenSource.replace('_token', '')}_token`

  // Try user-specific token first, then fall back to global token
  const userToken = await getSettingString(userSpecificKey, '')
  if (userToken) return userToken

  const globalToken = await getSettingString(globalKey, '')
  return globalToken || null
}
