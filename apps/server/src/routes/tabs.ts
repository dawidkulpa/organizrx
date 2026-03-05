import { Hono } from 'hono'
import { createTabRequestSchema, updateTabRequestSchema } from '@organizrx/shared'
import {
  listTabs,
  getTabById,
  createTab,
  updateTab,
  deleteTab,
  reorderTabs,
  getTabsByCategory,
} from '../services/tabs'
import { listCategories } from '../services/categories'
import { authMiddleware, requireGroup } from '../middleware/auth'

const tabs = new Hono()

// GET /api/tabs — List all tabs ordered by order (public, no filtering)
tabs.get('/', async (c) => {
  try {
    const result = await listTabs(null)
    return c.json({ data: result })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list tabs' } }, 500)
  }
})

// GET /api/tabs/category/:categoryId — List tabs by category (public, no filtering)
tabs.get('/category/:categoryId', async (c) => {
  try {
    const categoryId = parseInt(c.req.param('categoryId'), 10)

    if (isNaN(categoryId)) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid category ID' } }, 400)
    }

    const result = await getTabsByCategory(categoryId, null)
    return c.json({ data: result })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list tabs by category' } }, 500)
  }
})

// GET /api/tabs/sidebar — Authenticated sidebar data (tabs + categories filtered by user group)
tabs.get('/sidebar', authMiddleware(), async (c) => {
  try {
    const user = c.get('user')
    const groupId = user.groupID ?? 0
    const [tabsResult, categoriesResult] = await Promise.all([
      listTabs(groupId),
      listCategories(),
    ])
    return c.json({ data: { tabs: tabsResult, categories: categoriesResult } })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load sidebar data' } }, 500)
  }
})


// GET /api/tabs/:id — Get tab by ID
tabs.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10)

    if (isNaN(id)) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid tab ID' } }, 400)
    }

    const tab = await getTabById(id)

    if (!tab) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Tab not found' } }, 404)
    }

    return c.json({ data: tab })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get tab' } }, 500)
  }
})

// POST /api/tabs — Create tab (admin only)
tabs.post('/', authMiddleware(), requireGroup(0), async (c) => {
  try {
    const body = await c.req.json()
    const parsed = createTabRequestSchema.safeParse(body)

    if (!parsed.success) {
      return c.json(
        {
          error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
        },
        400
      )
    }

    const created = await createTab(parsed.data)
    return c.json({ data: created }, 201)
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create tab' } }, 500)
  }
})

// PUT /api/tabs/reorder — Bulk reorder (admin only) — MUST be before PUT /:id
tabs.put('/reorder', authMiddleware(), requireGroup(0), async (c) => {
  try {
    const body = await c.req.json()

    // Validate reorder body — accept 'tabs' (frontend) or 'items' (legacy)
    const items = body.tabs ?? body.items
    if (!items || !Array.isArray(items)) {
      return c.json(
        {
          error: { code: 'VALIDATION_ERROR', message: 'Expected tabs array in request body' },
        },
        400
      )
    }

    for (const item of items) {
      if (typeof item.id !== 'number' || typeof item.order !== 'number') {
        return c.json(
          {
            error: { code: 'VALIDATION_ERROR', message: 'Each item must have id and order as numbers' },
          },
          400
        )
      }
    }

    await reorderTabs(items)
    return c.json({ data: { reordered: true } })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to reorder tabs' } }, 500)
  }
})

// PUT /api/tabs/:id — Update tab (admin only)
tabs.put('/:id', authMiddleware(), requireGroup(0), async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10)

    if (isNaN(id)) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid tab ID' } }, 400)
    }

    const body = await c.req.json()
    const parsed = updateTabRequestSchema.safeParse(body)

    if (!parsed.success) {
      return c.json(
        {
          error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
        },
        400
      )
    }

    const updated = await updateTab(id, parsed.data)

    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Tab not found' } }, 404)
    }

    return c.json({ data: updated })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update tab' } }, 500)
  }
})

// DELETE /api/tabs/:id — Delete tab (admin only)
tabs.delete('/:id', authMiddleware(), requireGroup(0), async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10)

    if (isNaN(id)) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid tab ID' } }, 400)
    }

    const tab = await getTabById(id)

    if (!tab) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Tab not found' } }, 404)
    }

    if (tab.isDefault === 1) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Cannot delete a built-in system tab' } }, 403)
    }

    await deleteTab(id)

    return c.json({ data: { id, deleted: true } })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete tab' } }, 500)
  }
})

export default tabs
