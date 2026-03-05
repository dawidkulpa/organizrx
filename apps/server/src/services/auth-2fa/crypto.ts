import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

import { getEnv } from '../../config'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEncryptionKey(): Buffer {
  const secret = getEnv().JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured')
  return createHash('sha256').update(secret).digest()
}

// ---------------------------------------------------------------------------
// Secret encryption/decryption
// ---------------------------------------------------------------------------

export function encryptSecret(plainSecret: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  let encrypted = cipher.update(plainSecret, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decryptSecret(encryptedSecret: string): string {
  const key = getEncryptionKey()
  const [ivHex, authTagHex, encrypted] = encryptedSecret.split(':')

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
