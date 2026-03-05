import { eq } from 'drizzle-orm'

import { dialectCtx } from '../../db/dialect-ctx'

// ---------------------------------------------------------------------------
// Token storage (DB)
// ---------------------------------------------------------------------------

export async function storeRefreshToken(opts: {
  userId: number
  token: string
  browser: string | null
  ip: string | null
  expiresAt: Date
}): Promise<void> {
  const ctx = dialectCtx('tokens')
  const now = new Date()

  if (ctx.dialect === 'sqlite') {
    // SQLite tokens table uses text columns
    ctx.db
      .insert(ctx.tokens)
      .values({
        token: opts.token,
        user_id: opts.userId,
        browser: opts.browser,
        ip: opts.ip,
        created: now.toISOString(),
        expires: opts.expiresAt.toISOString(),
      })
      .run()
  } else if (ctx.dialect === 'mysql') {
    // MySQL tokens table uses timestamp columns (Date objects)
    await ctx.db.insert(ctx.tokens).values({
      token: opts.token,
      user_id: opts.userId,
      browser: opts.browser,
      ip: opts.ip,
      created: now,
      expires: opts.expiresAt,
    })
  } else {
    // PostgreSQL tokens table uses timestamp columns (Date objects)
    await ctx.db.insert(ctx.tokens).values({
      token: opts.token,
      user_id: opts.userId,
      browser: opts.browser,
      ip: opts.ip,
      created: now,
      expires: opts.expiresAt,
    })
  }
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const ctx = dialectCtx('tokens')

  if (ctx.dialect === 'sqlite') {
    ctx.db.delete(ctx.tokens).where(eq(ctx.tokens.token, token)).run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db.delete(ctx.tokens).where(eq(ctx.tokens.token, token))
  } else {
    await ctx.db.delete(ctx.tokens).where(eq(ctx.tokens.token, token))
  }
}

export async function revokeAllUserTokens(userId: number): Promise<void> {
  const ctx = dialectCtx('tokens')

  if (ctx.dialect === 'sqlite') {
    ctx.db.delete(ctx.tokens).where(eq(ctx.tokens.user_id, userId)).run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db.delete(ctx.tokens).where(eq(ctx.tokens.user_id, userId))
  } else {
    await ctx.db.delete(ctx.tokens).where(eq(ctx.tokens.user_id, userId))
  }
}

export async function isRefreshTokenValid(token: string): Promise<boolean> {
  const ctx = dialectCtx('tokens')

  let rows: unknown[]

  if (ctx.dialect === 'sqlite') {
    rows = ctx.db.select().from(ctx.tokens).where(eq(ctx.tokens.token, token)).all()
  } else if (ctx.dialect === 'mysql') {
    rows = await ctx.db.select().from(ctx.tokens).where(eq(ctx.tokens.token, token))
  } else {
    rows = await ctx.db.select().from(ctx.tokens).where(eq(ctx.tokens.token, token))
  }

  if (rows.length === 0) return false

  const record = rows[0] as { expires: string }
  return new Date(record.expires) > new Date()
}
