import { getSettingBoolean, getSettingNumber } from '../settings'

import { getInviteByCode, type Invite } from './db'

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

export function generateInviteCode(): string {
  return crypto.randomUUID()
}

export function isInviteExpired(invite: Invite): boolean {
  if (!invite.date) return false

  const expiryDays = 7 // Will be configurable
  const createdAt = new Date(invite.date)
  const expiryDate = new Date(createdAt.getTime() + expiryDays * 24 * 60 * 60 * 1000)

  return new Date() > expiryDate
}

export async function verifyInvite(code: string): Promise<{ valid: boolean; reason?: string }> {
  const enabled = await getSettingBoolean('invites_enabled', false)
  if (!enabled) {
    return { valid: false, reason: 'Invites are currently disabled' }
  }

  const invite = await getInviteByCode(code)

  if (!invite) {
    return { valid: false, reason: 'Invite code not found' }
  }

  if (invite.valid !== 'Yes') {
    return { valid: false, reason: 'Invite code has already been used' }
  }

  const expiryDays = await getSettingNumber('invites_expiry_days', 7)
  if (invite.date) {
    const createdAt = new Date(invite.date)
    const expiryDate = new Date(createdAt.getTime() + expiryDays * 24 * 60 * 60 * 1000)

    if (new Date() > expiryDate) {
      return { valid: false, reason: 'Invite code has expired' }
    }
  }

  return { valid: true }
}
