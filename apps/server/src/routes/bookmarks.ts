import { Hono } from 'hono'
import { createBookmarkCategoryRequestSchema, createBookmarkTabRequestSchema } from '@organizrx/shared'
import {
  listBookmarkCategories,
  getBookmarkCategoryById,
  createBookmarkCategory,
  updateBookmarkCategory,
  deleteBookmarkCategory,
  reorderBookmarkCategories,
  bookmarkCategoryHasTabs,
  listBookmarkTabs,
  getBookmarkTabById,
  createBookmarkTab,
  updateBookmarkTab,
  deleteBookmarkTab,
  reorderBookmarkTabs,
} from '../services/bookmarks'
import { authMiddleware, requireGroup } from '../middleware/auth'

const bookmarks = new Hono()

// ---------------------------------------------------------------------------
// Bookmark Categories
// ---------------------------------------------------------------------------

// GET /api/bookmarks — List all bookmark categories
bookmarks.get('/', authMiddleware(), async (c) => {
  try {
    const result = await listBookmarkCategories()
    return c.json({ data: result })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list bookmarks' } }, 500)
  }
})

// GET /api/bookmarks/categories — List all bookmark categories ordered by order
bookmarks.get('/categories', authMiddleware(), async (c) => {
  try {
    const result = await listBookmarkCategories()
    return c.json({ data: result })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list bookmark categories' } }, 500)
  }
})

// GET /api/bookmarks/categories/:id — Get bookmark category by ID
bookmarks.get('/categories/:id', authMiddleware(), async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10)

    if (isNaN(id)) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid bookmark category ID' } }, 400)
    }

    const category = await getBookmarkCategoryById(id)

    if (!category) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Bookmark category not found' } }, 404)
    }

    return c.json({ data: category })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get bookmark category' } }, 500)
  }
})

// POST /api/bookmarks/categories — Create bookmark category (admin only)
bookmarks.post('/categories', authMiddleware(), requireGroup(0), async (c) => {
  try {
    const body = await c.req.json()
    const parsed = createBookmarkCategoryRequestSchema.safeParse(body)

    if (!parsed.success) {
      return c.json(
        {
          error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
        },
        400
      )
    }

    const created = await createBookmarkCategory(parsed.data)
    return c.json({ data: created }, 201)
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create bookmark category' } }, 500)
  }
})

// PUT /api/bookmarks/categories/:id — Update bookmark category (admin only)
bookmarks.put('/categories/:id', authMiddleware(), requireGroup(0), async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10)

    if (isNaN(id)) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid bookmark category ID' } }, 400)
    }

    const body = await c.req.json()
    const parsed = createBookmarkCategoryRequestSchema.partial().safeParse(body)

    if (!parsed.success) {
      return c.json(
        {
          error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
        },
        400
      )
    }

    const updated = await updateBookmarkCategory(id, parsed.data)

    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Bookmark category not found' } }, 404)
    }

    return c.json({ data: updated })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update bookmark category' } }, 500)
  }
})

// DELETE /api/bookmarks/categories/:id — Delete bookmark category (admin only)
bookmarks.delete('/categories/:id', authMiddleware(), requireGroup(0), async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10)

    if (isNaN(id)) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid bookmark category ID' } }, 400)
    }

    const hasTabs = await bookmarkCategoryHasTabs(id)

    if (hasTabs) {
      return c.json(
        { error: { code: 'CONFLICT', message: 'Cannot delete bookmark category with existing tabs' } },
        409
      )
    }

    await deleteBookmarkCategory(id)
    return c.json({ data: { id, deleted: true } })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete bookmark category' } }, 500)
  }
})

// PUT /api/bookmarks/categories/reorder — Bulk reorder bookmark categories (admin only)
bookmarks.put('/categories/reorder', authMiddleware(), requireGroup(0), async (c) => {
  try {
    const body = await c.req.json()

    if (!body.items || !Array.isArray(body.items)) {
      return c.json(
        {
          error: { code: 'VALIDATION_ERROR', message: 'Expected items array in request body' },
        },
        400
      )
    }

    for (const item of body.items) {
      if (typeof item.id !== 'number' || typeof item.order !== 'number') {
        return c.json(
          {
            error: { code: 'VALIDATION_ERROR', message: 'Each item must have id and order as numbers' },
          },
          400
        )
      }
    }

    await reorderBookmarkCategories(body.items)
    return c.json({ data: { reordered: true } })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to reorder bookmark categories' } }, 500)
  }
})

// ---------------------------------------------------------------------------
// Bookmark Tabs
// ---------------------------------------------------------------------------

// GET /api/bookmarks/tabs — List all bookmark tabs filtered by user's group
bookmarks.get('/tabs', authMiddleware(), async (c) => {
  try {
    const user = c.get('user')
    const result = await listBookmarkTabs(user.groupID)
    return c.json({ data: result })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list bookmark tabs' } }, 500)
  }
})

// GET /api/bookmarks/tabs/:id — Get bookmark tab by ID
bookmarks.get('/tabs/:id', authMiddleware(), async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10)

    if (isNaN(id)) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid bookmark tab ID' } }, 400)
    }

    const tab = await getBookmarkTabById(id)

    if (!tab) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Bookmark tab not found' } }, 404)
    }

    return c.json({ data: tab })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get bookmark tab' } }, 500)
  }
})

// POST /api/bookmarks/tabs — Create bookmark tab (admin only)
bookmarks.post('/tabs', authMiddleware(), requireGroup(0), async (c) => {
  try {
    const body = await c.req.json()
    const parsed = createBookmarkTabRequestSchema.safeParse(body)

    if (!parsed.success) {
      return c.json(
        {
          error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
        },
        400
      )
    }

    const created = await createBookmarkTab(parsed.data)
    return c.json({ data: created }, 201)
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create bookmark tab' } }, 500)
  }
})

// PUT /api/bookmarks/tabs/:id — Update bookmark tab (admin only)
bookmarks.put('/tabs/:id', authMiddleware(), requireGroup(0), async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10)

    if (isNaN(id)) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid bookmark tab ID' } }, 400)
    }

    const body = await c.req.json()
    const parsed = createBookmarkTabRequestSchema.partial().safeParse(body)

    if (!parsed.success) {
      return c.json(
        {
          error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
        },
        400
      )
    }

    const updated = await updateBookmarkTab(id, parsed.data)

    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Bookmark tab not found' } }, 404)
    }

    return c.json({ data: updated })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update bookmark tab' } }, 500)
  }
})

// DELETE /api/bookmarks/tabs/:id — Delete bookmark tab (admin only)
bookmarks.delete('/tabs/:id', authMiddleware(), requireGroup(0), async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10)

    if (isNaN(id)) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid bookmark tab ID' } }, 400)
    }

    await deleteBookmarkTab(id)
    return c.json({ data: { id, deleted: true } })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete bookmark tab' } }, 500)
  }
})

// PUT /api/bookmarks/tabs/reorder — Bulk reorder bookmark tabs (admin only)
bookmarks.put('/tabs/reorder', authMiddleware(), requireGroup(0), async (c) => {
  try {
    const body = await c.req.json()

    if (!body.items || !Array.isArray(body.items)) {
      return c.json(
        {
          error: { code: 'VALIDATION_ERROR', message: 'Expected items array in request body' },
        },
        400
      )
    }

    for (const item of body.items) {
      if (typeof item.id !== 'number' || typeof item.order !== 'number') {
        return c.json(
          {
            error: { code: 'VALIDATION_ERROR', message: 'Each item must have id and order as numbers' },
          },
          400
        )
      }
    }

    await reorderBookmarkTabs(body.items)
    return c.json({ data: { reordered: true } })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to reorder bookmark tabs' } }, 500)
  }
})

export default bookmarks
