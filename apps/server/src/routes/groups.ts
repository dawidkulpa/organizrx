import { Hono } from 'hono'
import { createGroupRequestSchema, updateGroupRequestSchema } from '@organizrx/shared'
import {
  listGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
} from '../services/groups'
import { authMiddleware, requireGroup } from '../middleware/auth'

const groups = new Hono()

// GET /api/groups — List all groups (authenticated users)
groups.get('/', authMiddleware(), async (c) => {
  const allGroups = await listGroups()

  return c.json({
    data: { groups: allGroups },
  })
})

// GET /api/groups/:id — Get group by ID (authenticated users)
groups.get('/:id', authMiddleware(), async (c) => {
  const id = Number(c.req.param('id'))

  if (Number.isNaN(id)) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid group ID' },
    }, 400)
  }

  const group = await getGroupById(id)

  if (!group) {
    return c.json({
      error: { code: 'GROUP_NOT_FOUND', message: 'Group not found' },
    }, 404)
  }

  return c.json({
    data: { group },
  })
})

// POST /api/groups — Create group (admin only)
groups.post('/', authMiddleware(), requireGroup(0), async (c) => {
  const body = await c.req.json()
  const parsed = createGroupRequestSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
    }, 400)
  }

  const { name, group_id, image, isDefault } = parsed.data

  // Validate: custom groups must have group_id <= 0 or special IDs
  if (group_id > 0 && group_id < 999) {
    return c.json({
      error: { code: 'INVALID_GROUP_ID', message: 'Group ID must be <= 0 for custom groups' },
    }, 400)
  }

  try {
    const created = await createGroup({
      name,
      group_id,
      image,
      isDefault,
    })

    return c.json({
      data: { group: created },
    }, 201)
  } catch (error) {
    return c.json({
      error: { code: 'CREATE_FAILED', message: error instanceof Error ? error.message : 'Failed to create group' },
    }, 400)
  }
})

// PUT /api/groups/:id — Update group (admin only)
groups.put('/:id', authMiddleware(), requireGroup(0), async (c) => {
  const id = Number(c.req.param('id'))

  if (Number.isNaN(id)) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid group ID' },
    }, 400)
  }

  const body = await c.req.json()
  const parsed = updateGroupRequestSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
    }, 400)
  }

  try {
    const updated = await updateGroup(id, parsed.data)

    if (!updated) {
      return c.json({
        error: { code: 'GROUP_NOT_FOUND', message: 'Group not found' },
      }, 404)
    }

    return c.json({
      data: { group: updated },
    })
  } catch (error) {
    return c.json({
      error: { code: 'UPDATE_FAILED', message: error instanceof Error ? error.message : 'Failed to update group' },
    }, 400)
  }
})

// DELETE /api/groups/:id — Delete group (admin only)
groups.delete('/:id', authMiddleware(), requireGroup(0), async (c) => {
  const id = Number(c.req.param('id'))

  if (Number.isNaN(id)) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid group ID' },
    }, 400)
  }

  try {
    const deleted = await deleteGroup(id)

    if (!deleted) {
      return c.json({
        error: { code: 'GROUP_NOT_FOUND', message: 'Group not found' },
      }, 404)
    }

    return c.json({
      data: { success: true },
    })
  } catch (error) {
    return c.json({
      error: { code: 'DELETE_FAILED', message: error instanceof Error ? error.message : 'Failed to delete group' },
    }, 400)
  }
})

export default groups
