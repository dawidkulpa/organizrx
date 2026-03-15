import { getInviteByCode, parseInviteType, type Invite } from './db'

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

export function generateInviteCode(): string {
  return crypto.randomUUID()
}

export function isInviteExpired(invite: Invite): boolean {
  if (!invite.date) return false

  const { expiresInDays } = parseInviteType(invite.type)
  if (expiresInDays === null) {
    return false
  }

  const expiryDays = expiresInDays
  const createdAt = new Date(invite.date)
  const expiryDate = new Date(createdAt.getTime() + expiryDays * 24 * 60 * 60 * 1000)

  return new Date() > expiryDate
}

export async function verifyInvite(code: string): Promise<{ valid: boolean; reason?: string }> {
  const invite = await getInviteByCode(code)

  if (!invite) {
    return { valid: false, reason: 'Invite code not found' }
  }

  const { reusable } = parseInviteType(invite.type)

  if (!reusable && invite.valid !== 'Yes') {
    return { valid: false, reason: 'Invite code has already been used' }
  }

  if (isInviteExpired(invite)) {
    return { valid: false, reason: 'Invite code has expired' }
  }

  return { valid: true }
}
