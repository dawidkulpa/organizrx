import { randomBytes } from 'crypto'

import { hashPassword, verifyPassword } from '../auth'

// ---------------------------------------------------------------------------
// Backup codes
// ---------------------------------------------------------------------------

export async function generateBackupCodes(): Promise<{ plain: string[]; hashed: string[] }> {
  const codes: string[] = []
  const hashed: string[] = []

  for (let i = 0; i < 8; i++) {
    const code = randomBytes(4).toString('hex').toUpperCase()
    codes.push(code)
    hashed.push(await hashPassword(code))
  }

  return { plain: codes, hashed }
}

export async function verifyBackupCode(
  code: string,
  hashedCodes: string[]
): Promise<{ valid: boolean; remainingCodes: string[] }> {
  for (let i = 0; i < hashedCodes.length; i++) {
    const isValid = await verifyPassword(code, hashedCodes[i])
    if (isValid) {
      const remainingCodes = [...hashedCodes]
      remainingCodes.splice(i, 1)
      return { valid: true, remainingCodes }
    }
  }

  return { valid: false, remainingCodes: hashedCodes }
}
