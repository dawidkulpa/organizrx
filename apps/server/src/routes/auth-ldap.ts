import { Hono } from 'hono'
import { z } from 'zod'

import { authMiddleware, requireGroup } from '../middleware/auth'
import {
  createAccessToken,
  createRefreshToken,
  storeRefreshToken,
  checkLockout,
  recordFailedAttempt,
  clearFailedAttempts,
} from '../services/auth'
import {
  testLdapConnection,
  authenticateLdap,
  mapLdapGroupToOrganizr,
  findOrCreateLdapUser,
  isLdapEnabled,
  loadLdapConfig,
  type LdapConfig,
  type LdapType,
} from '../services/auth-ldap'
import { getConfig } from '../config'

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const ldapTestRequestSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(389),
  baseDn: z.string().min(1),
  bindUsername: z.string().default(''),
  bindPassword: z.string().default(''),
  ldapType: z.enum(['ad', 'openldap', 'freeipa']).default('ad'),
  ssl: z.boolean().default(false),
  tls: z.boolean().default(false),
  searchFilter: z.string().default(''),
  groupMapping: z.record(z.string(), z.number()).default({}),
})

const ldapLoginRequestSchema = z.object({
  username: z.string().min(1).max(255),
  password: z.string().min(1).max(255),
  rememberMe: z.boolean().optional(),
})

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const ldapAuth = new Hono()

// POST /ldap/test — admin-only endpoint to test LDAP connection
ldapAuth.post('/ldap/test', authMiddleware(), requireGroup(0), async (c) => {
  const body = await c.req.json()
  const parsed = ldapTestRequestSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
    }, 400)
  }

  const config: LdapConfig = {
    host: parsed.data.host,
    port: parsed.data.port,
    baseDn: parsed.data.baseDn,
    bindUsername: parsed.data.bindUsername,
    bindPassword: parsed.data.bindPassword,
    ldapType: parsed.data.ldapType as LdapType,
    ssl: parsed.data.ssl,
    tls: parsed.data.tls,
    searchFilter: parsed.data.searchFilter,
    groupMapping: parsed.data.groupMapping,
  }

  const result = await testLdapConnection(config)

  if (!result.success) {
    return c.json({
      error: { code: 'LDAP_CONNECTION_FAILED', message: result.message },
    }, 400)
  }

  return c.json({ data: { success: true, message: result.message } })
})

// POST /ldap/login — authenticate via LDAP
ldapAuth.post('/ldap/login', async (c) => {
  const ldapEnabled = await isLdapEnabled()

  if (!ldapEnabled) {
    return c.json({
      error: { code: 'LDAP_DISABLED', message: 'LDAP authentication is not enabled' },
    }, 400)
  }

  const body = await c.req.json()
  const parsed = ldapLoginRequestSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
    }, 400)
  }

  const { username, password, rememberMe } = parsed.data

  // Check lockout
  const lockout = checkLockout(username)
  if (lockout.locked) {
    const seconds = Math.ceil(lockout.remainingMs / 1000)
    return c.json({
      error: { code: 'ACCOUNT_LOCKED', message: `Account locked. Try again in ${seconds} seconds.` },
    }, 429)
  }

  try {
    const config = await loadLdapConfig()
    const ldapUser = await authenticateLdap(username, password, config)

    if (!ldapUser) {
      recordFailedAttempt(username)
      return c.json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' },
      }, 401)
    }

    clearFailedAttempts(username)

    // Map LDAP groups to OrganizrX group
    const groupId = mapLdapGroupToOrganizr(ldapUser.groups, config.groupMapping)

    // Find or create local user
    const authUser = await findOrCreateLdapUser(ldapUser, groupId)

    // Issue tokens
    const accessToken = await createAccessToken(authUser)
    const refreshToken = await createRefreshToken(authUser.id, rememberMe)

    const { auth: authConfig } = getConfig()
    const days = rememberMe ? authConfig.rememberMeDays : authConfig.refreshTokenExpiryDays
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

    await storeRefreshToken({
      userId: authUser.id,
      token: refreshToken,
      browser: c.req.header('User-Agent') ?? null,
      ip: c.req.header('X-Forwarded-For') ?? c.req.header('X-Real-IP') ?? null,
      expiresAt,
    })

    return c.json({
      data: {
        accessToken,
        refreshToken,
        user: authUser,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'LDAP authentication failed'
    return c.json({
      error: { code: 'LDAP_ERROR', message },
    }, 500)
  }
})

export default ldapAuth
