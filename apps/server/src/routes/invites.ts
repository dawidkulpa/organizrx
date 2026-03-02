import { Hono } from 'hono'
import { z } from 'zod'
import {
  createInvite,
  getInvites,
  getInviteByCode,
  verifyInvite,
  redeemInvite,
  revokeInvite,
} from '../services/invites'
import { authMiddleware } from '../middleware/auth'

const invites = new Hono()

// Validation schemas
const createInviteSchema = z.object({
  email: z.string().email().optional(),
})

const redeemInviteSchema = z.object({
  code: z.string().min(1, 'Invite code is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  email: z.string().email('Valid email is required'),
})

// GET /api/invites — list invites (requires auth)
invites.get('/', authMiddleware(), async (c) => {
  const user = c.get('user')
  const isAdmin = user.groupID !== null && user.groupID <= 1

  try {
    const inviteList = await getInvites(String(user.userID), isAdmin)
    return c.json({ data: inviteList })
  } catch (error) {
    return c.json({
      error: {
        code: 'FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch invites',
      },
    }, 500)
  }
})

// POST /api/invites — create new invite (requires auth)
invites.post('/', authMiddleware(), async (c) => {
  const user = c.get('user')
  
  const body = await c.req.json()
  const parsed = createInviteSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
    }, 400)
  }

  try {
    const result = await createInvite({
      email: parsed.data.email,
      invitedby: String(user.userID),
      type: 'user',
    })

    return c.json({
      data: {
        id: result.id,
        code: result.code,
      },
    })
  } catch (error) {
    return c.json({
      error: {
        code: 'CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create invite',
      },
    }, 400)
  }
})

// GET /api/invites/:code/verify — verify invite code (PUBLIC)
invites.get('/:code/verify', async (c) => {
  const code = c.req.param('code')

  if (!code) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: 'Invite code is required' },
    }, 400)
  }

  try {
    const result = await verifyInvite(code)
    
    if (!result.valid) {
      return c.json({
        error: {
          code: 'INVALID_INVITE',
          message: result.reason ?? 'Invalid invite code',
        },
      }, 400)
    }

    const invite = await getInviteByCode(code)
    
    return c.json({
      data: {
        valid: true,
        email: invite?.email ?? null,
      },
    })
  } catch (error) {
    return c.json({
      error: {
        code: 'VERIFICATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to verify invite',
      },
    }, 500)
  }
})

// POST /api/invites/redeem — redeem invite code (PUBLIC)
invites.post('/redeem', async (c) => {
  const body = await c.req.json()
  const parsed = redeemInviteSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
    }, 400)
  }

  const { code, username, password, email } = parsed.data

  // Extract client IP
  const ip = c.req.header('X-Forwarded-For')?.split(',')[0].trim() 
    ?? c.req.header('X-Real-IP') 
    ?? null

  try {
    const result = await redeemInvite(code, username, password, email, ip)
    
    return c.json({
      data: {
        userId: result.userId,
        message: 'Account created successfully',
      },
    })
  } catch (error) {
    return c.json({
      error: {
        code: 'REDEEM_ERROR',
        message: error instanceof Error ? error.message : 'Failed to redeem invite',
      },
    }, 400)
  }
})

// DELETE /api/invites/:id — revoke invite (requires auth)
invites.delete('/:id', authMiddleware(), async (c) => {
  const user = c.get('user')
  const idParam = c.req.param('id')
  const id = Number.parseInt(idParam, 10)

  if (Number.isNaN(id)) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid invite ID' },
    }, 400)
  }

  const isAdmin = user.groupID !== null && user.groupID <= 1

  try {
    await revokeInvite(id, String(user.userID), isAdmin)
    
    return c.json({
      data: { success: true, message: 'Invite revoked successfully' },
    })
  } catch (error) {
    return c.json({
      error: {
        code: 'REVOKE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to revoke invite',
      },
    }, 403)
  }
})

export default invites
