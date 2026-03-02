import { Hono } from 'hono'
import { createCategoryRequestSchema, updateCategoryRequestSchema } from '@organizrx/shared'
import {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '../services/categories'
import { authMiddleware, requireGroup } from '../middleware/auth'

const categories = new Hono()

// GET /api/categories — List all categories ordered by order
categories.get('/', async (c) => {
  try {
    const result = await listCategories()
    return c.json({ data: result })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list categories' } }, 500)
  }
})

// GET /api/categories/:id — Get category by ID
categories.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10)

    if (isNaN(id)) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid category ID' } }, 400)
    }

    const category = await getCategoryById(id)

    if (!category) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Category not found' } }, 404)
    }

    return c.json({ data: category })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get category' } }, 500)
  }
})

// POST /api/categories — Create category (admin only)
categories.post('/', authMiddleware(), requireGroup(0), async (c) => {
  try {
    const body = await c.req.json()
    const parsed = createCategoryRequestSchema.safeParse(body)

    if (!parsed.success) {
      return c.json(
        {
          error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
        },
        400
      )
    }

    const created = await createCategory(parsed.data)
    return c.json({ data: created }, 201)
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create category' } }, 500)
  }
})

// PUT /api/categories/:id — Update category (admin only)
categories.put('/:id', authMiddleware(), requireGroup(0), async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10)

    if (isNaN(id)) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid category ID' } }, 400)
    }

    const body = await c.req.json()
    const parsed = updateCategoryRequestSchema.safeParse(body)

    if (!parsed.success) {
      return c.json(
        {
          error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
        },
        400
      )
    }

    const updated = await updateCategory(id, parsed.data)

    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Category not found' } }, 404)
    }

    return c.json({ data: updated })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update category' } }, 500)
  }
})

// DELETE /api/categories/:id — Delete category (admin only)
categories.delete('/:id', authMiddleware(), requireGroup(0), async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10)

    if (isNaN(id)) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid category ID' } }, 400)
    }

    const deleted = await deleteCategory(id)

    if (!deleted) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Category not found' } }, 404)
    }

    return c.json({ data: { id, deleted: true } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete category'

    if (message.includes('Cannot delete category with existing tabs')) {
      return c.json(
        { error: { code: 'CONFLICT', message: 'Cannot delete category with existing tabs' } },
        409
      )
    }

    return c.json({ error: { code: 'INTERNAL_ERROR', message } }, 500)
  }
})

// PUT /api/categories/reorder — Bulk reorder (admin only)
categories.put('/reorder', authMiddleware(), requireGroup(0), async (c) => {
  try {
    const body = await c.req.json()

    // Validate reorder body
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

    await reorderCategories(body.items)
    return c.json({ data: { reordered: true } })
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to reorder categories' } }, 500)
  }
})

export default categories
