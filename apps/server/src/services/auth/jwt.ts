import { SignJWT, jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose'

import { getEnv, getConfig } from '../../config'

import type { AuthUser } from '@organizrx/shared'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AccessTokenPayload extends JoseJWTPayload {
  name: string
  groupName: string | null
  groupID: number | null
  userID: number
  email: string | null
  image: string | null
}

export interface RefreshTokenPayload extends JoseJWTPayload {
  userId: number
  type: 'refresh'
}

// ---------------------------------------------------------------------------
// Secret
// ---------------------------------------------------------------------------

function getJwtSecret(): Uint8Array {
  const secret = getEnv().JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured')
  return new TextEncoder().encode(secret)
}

// ---------------------------------------------------------------------------
// JWT — Access tokens (short-lived, default 15 min)
// ---------------------------------------------------------------------------

export async function createAccessToken(user: AuthUser): Promise<string> {
  const { auth } = getConfig()
  const expirySeconds = Math.floor(auth.accessTokenExpiryMs / 1000)

  return new SignJWT({
    name: user.username,
    groupName: user.groupName,
    groupID: user.group_id,
    userID: user.id,
    email: user.email,
    image: user.image,
  } satisfies Omit<AccessTokenPayload, keyof JoseJWTPayload>)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setIssuer('OrganizrX')
    .setExpirationTime(`${expirySeconds}s`)
    .sign(getJwtSecret())
}

// algorithms: ['HS256'] required to prevent algorithm confusion attacks
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    algorithms: ['HS256'],
    issuer: 'OrganizrX',
  })
  return payload as AccessTokenPayload
}

// ---------------------------------------------------------------------------
// JWT — Refresh tokens (long-lived, default 7 days)
// ---------------------------------------------------------------------------

export async function createRefreshToken(userId: number, rememberMe?: boolean): Promise<string> {
  const { auth } = getConfig()
  const days = rememberMe ? auth.rememberMeDays : auth.refreshTokenExpiryDays

  return new SignJWT({
    userId,
    type: 'refresh' as const,
  } satisfies Omit<RefreshTokenPayload, keyof JoseJWTPayload>)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setIssuer('OrganizrX')
    .setExpirationTime(`${days}d`)
    .sign(getJwtSecret())
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    algorithms: ['HS256'],
    issuer: 'OrganizrX',
  })

  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type: expected refresh token')
  }

  return payload as RefreshTokenPayload
}
