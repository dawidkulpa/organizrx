import { getConfig } from '../../config'

// ---------------------------------------------------------------------------
// Password hashing (Bun.password handles legacy PHP $2y$ prefixes natively)
// ---------------------------------------------------------------------------

export async function hashPassword(plain: string): Promise<string> {
  const { auth } = getConfig()
  return Bun.password.hash(plain, { algorithm: 'bcrypt', cost: auth.bcryptRounds })
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return Bun.password.verify(plain, hash)
}
