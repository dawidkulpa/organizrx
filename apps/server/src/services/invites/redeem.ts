import { eq } from 'drizzle-orm'

import { dialectCtx } from '../../db/dialect-ctx'
import { hashPassword } from '../auth'
import { getSettingNumber } from '../settings'
import { getInviteByCode } from './db'
import { verifyInvite } from './logic'

// ---------------------------------------------------------------------------
// Invite Redemption
// ---------------------------------------------------------------------------

export async function redeemInvite(
  code: string,
  username: string,
  password: string,
  email: string,
  ip?: string | null
): Promise<{ userId: number }> {
  const ctx = dialectCtx('invites', 'users')

  // Verify invite is valid
  const verification = await verifyInvite(code)
  if (!verification.valid) {
    throw new Error(verification.reason ?? 'Invalid invite code')
  }

  const invite = await getInviteByCode(code)
  if (!invite) {
    throw new Error('Invite code not found')
  }

  // Check email restriction
  if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
    throw new Error('This invite is restricted to a different email address')
  }

  // Check if username already exists
  let existingUser: unknown[]
  if (ctx.dialect === 'sqlite') {
    existingUser = ctx.db.select().from(ctx.users).where(eq(ctx.users.username, username)).all()
  } else if (ctx.dialect === 'mysql') {
    existingUser = await ctx.db.select().from(ctx.users).where(eq(ctx.users.username, username))
  } else {
    existingUser = await ctx.db.select().from(ctx.users).where(eq(ctx.users.username, username))
  }

  if (existingUser.length > 0) {
    throw new Error('Username already exists')
  }

  // Hash password
  const hashedPassword = await hashPassword(password)

  // Get default group ID from settings
  const defaultGroupId = await getSettingNumber('invites_default_group_id', 4)
  const now = new Date()

  // Create user
  let userId: number
  if (ctx.dialect === 'sqlite') {
    const result = ctx.db
      .insert(ctx.users)
      .values({
        username,
        password: hashedPassword,
        email,
        auth_service: 'internal',
        group_id: defaultGroupId,
        locked: 0,
        register_date: now.toISOString(),
        image: null,
        groupName: null,
        plex_token: null,
        totp_secret: null,
        totp_enabled: 0,
        totp_backup_codes: null,
      })
      .returning()
      .all()
    userId = result[0].id
  } else if (ctx.dialect === 'mysql') {
    const result = await ctx.db.insert(ctx.users).values({
      username,
      password: hashedPassword,
      email,
      auth_service: 'internal',
      group_id: defaultGroupId,
      locked: 0,
      register_date: now,
      image: null,
      groupName: null,
      plex_token: null,
      totp_secret: null,
      totp_enabled: 0,
      totp_backup_codes: null,
    })
    userId = result[0].insertId
  } else {
    const result = await ctx.db
      .insert(ctx.users)
      .values({
        username,
        password: hashedPassword,
        email,
        auth_service: 'internal',
        group_id: defaultGroupId,
        locked: 0,
        register_date: now,
        image: null,
        groupName: null,
        plex_token: null,
        totp_secret: null,
        totp_enabled: 0,
        totp_backup_codes: null,
      })
      .returning()
    userId = result[0].id
  }

  // Mark invite as used
  if (ctx.dialect === 'sqlite') {
    ctx.db
      .update(ctx.invites)
      .set({
        valid: 'No',
        usedby: username,
        dateused: now.toISOString(),
        username,
        ip: ip ?? null,
      })
      .where(eq(ctx.invites.id, invite.id))
      .run()
  } else if (ctx.dialect === 'mysql') {
    await ctx.db
      .update(ctx.invites)
      .set({
        valid: 'No',
        usedby: username,
        dateused: now,
        username,
        ip: ip ?? null,
      })
      .where(eq(ctx.invites.id, invite.id))
  } else {
    await ctx.db
      .update(ctx.invites)
      .set({
        valid: 'No',
        usedby: username,
        dateused: now,
        username,
        ip: ip ?? null,
      })
      .where(eq(ctx.invites.id, invite.id))
  }

  return { userId }
}
