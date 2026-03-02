import { Hono } from 'hono'
import { createUserRequestSchema, updateUserRequestSchema } from '@organizrx/shared'
import { z } from 'zod'
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  isUsernameTaken,
} from '../services/users'
import { hashPassword, verifyPassword, revokeAllUserTokens } from '../services/auth'
import { authMiddleware, requireGroup } from '../middleware/auth'

const users = new Hono()

// GET /api/users — List users (admin only)
users.get('/', authMiddleware(), requireGroup(0), async (c) => {
  const query = c.req.query()
  const page = query.page ? parseInt(query.page, 10) : 1
  const limit = query.limit ? parseInt(query.limit, 10) : 20

  if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1 || limit > 100) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid page or limit parameter' },
    }, 400)
  }

  const result = await listUsers(page, limit)

  return c.json({
    data: {
      users: result.users,
      meta: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    },
  })
})

// GET /api/users/:id — Get user by ID
users.get('/:id', authMiddleware(), async (c) => {
  const tokenUser = c.get('user')
  const id = parseInt(c.req.param('id'), 10)

  if (isNaN(id)) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid user ID' },
    }, 400)
  }

  // Admin can see any user, regular users can only see themselves
  const isAdmin = tokenUser.groupID !== null && tokenUser.groupID <= 0
  if (!isAdmin && tokenUser.userID !== id) {
    return c.json({
      error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
    }, 403)
  }

  const user = await getUserById(id)

  if (!user) {
    return c.json({
      error: { code: 'USER_NOT_FOUND', message: 'User not found' },
    }, 404)
  }

  return c.json({ data: { user } })
})

// POST /api/users — Create user (admin only)
users.post('/', authMiddleware(), requireGroup(0), async (c) => {
  const body = await c.req.json()
  const parsed = createUserRequestSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
    }, 400)
  }

  const { username, password, email, group, group_id } = parsed.data

  // Check username uniqueness
  if (await isUsernameTaken(username)) {
    return c.json({
      error: { code: 'USERNAME_TAKEN', message: 'Username already exists' },
    }, 409)
  }

  // Hash password
  const passwordHash = await hashPassword(password)

  const user = await createUser({
    username,
    password: passwordHash,
    email: email ?? null,
    group: group ?? null,
    group_id: group_id ?? null,
  })

  return c.json({ data: { user } }, 201)
})

// PUT /api/users/:id — Update user
users.put('/:id', authMiddleware(), async (c) => {
  const tokenUser = c.get('user')
  const id = parseInt(c.req.param('id'), 10)

  if (isNaN(id)) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid user ID' },
    }, 400)
  }

  const body = await c.req.json()
  const parsed = updateUserRequestSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
    }, 400)
  }

  const isAdmin = tokenUser.groupID !== null && tokenUser.groupID <= 0

  // Regular users can only update their own profile (email, image)
  if (!isAdmin && tokenUser.userID !== id) {
    return c.json({
      error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
    }, 403)
  }

  // Regular users cannot change username, group, group_id
  if (!isAdmin) {
    if (parsed.data.username !== undefined || parsed.data.group !== undefined || parsed.data.group_id !== undefined) {
      return c.json({
        error: { code: 'FORBIDDEN', message: 'Only admins can change username or group settings' },
      }, 403)
    }
  }

  // Check username uniqueness if username is being changed
  if (parsed.data.username && await isUsernameTaken(parsed.data.username, id)) {
    return c.json({
      error: { code: 'USERNAME_TAKEN', message: 'Username already exists' },
    }, 409)
  }

  // Hash password if present
  const updateData: Record<string, string | number | null> = {
    ...parsed.data,
  }

  if (parsed.data.password) {
    updateData.password = await hashPassword(parsed.data.password)
  }

  const user = await updateUser(id, updateData)

  if (!user) {
    return c.json({
      error: { code: 'USER_NOT_FOUND', message: 'User not found' },
    }, 404)
  }

  return c.json({ data: { user } })
})

// DELETE /api/users/:id — Delete user (admin only)
users.delete('/:id', authMiddleware(), requireGroup(0), async (c) => {
  const tokenUser = c.get('user')
  const id = parseInt(c.req.param('id'), 10)

  if (isNaN(id)) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid user ID' },
    }, 400)
  }

  // Cannot delete yourself
  if (tokenUser.userID === id) {
    return c.json({
      error: { code: 'FORBIDDEN', message: 'Cannot delete your own account' },
    }, 403)
  }

  const user = await getUserById(id)

  if (!user) {
    return c.json({
      error: { code: 'USER_NOT_FOUND', message: 'User not found' },
    }, 404)
  }

  // Revoke all user's tokens
  await revokeAllUserTokens(id)

  // Delete user
  await deleteUser(id)

  return c.json({ data: { success: true } })
})

// PUT /api/users/:id/password — Change password
users.put('/:id/password', authMiddleware(), async (c) => {
  const tokenUser = c.get('user')
  const id = parseInt(c.req.param('id'), 10)

  if (isNaN(id)) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid user ID' },
    }, 400)
  }

  const body = await c.req.json()
  const schema = z.object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(1).max(255),
  })

  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
    }, 400)
  }

  const { currentPassword, newPassword } = parsed.data

  const isAdmin = tokenUser.groupID !== null && tokenUser.groupID <= 0

  // User can change own password with current password
  // Admin can change any user's password without current password
  if (!isAdmin && tokenUser.userID !== id) {
    return c.json({
      error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
    }, 403)
  }

  // If user is changing own password, require current password
  if (tokenUser.userID === id && !isAdmin) {
    if (!currentPassword) {
      return c.json({
        error: { code: 'VALIDATION_ERROR', message: 'Current password is required' },
      }, 400)
    }

    // Verify current password
    const user = await getUserById(id)
    if (!user) {
      return c.json({
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      }, 404)
    }

    // Get user with password
    const { findUserById } = await import('../services/auth')
    const userWithPassword = await findUserById(id)

    if (!userWithPassword) {
      return c.json({
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      }, 404)
    }

    // Check password field exists
    const userRecord = userWithPassword as unknown as { password?: string }
    if (!userRecord.password) {
      return c.json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Current password verification failed' },
      }, 401)
    }

    const valid = await verifyPassword(currentPassword, userRecord.password)
    if (!valid) {
      return c.json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect' },
      }, 401)
    }
  }

  // Hash new password
  const newPasswordHash = await hashPassword(newPassword)

  // Update password
  await changePassword(id, newPasswordHash)

  return c.json({ data: { success: true } })
})

export default users
