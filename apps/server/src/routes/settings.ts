import { Hono } from 'hono'
import { updateSettingRequestSchema } from '@organizrx/shared'
import { authMiddleware, requireGroup } from '../middleware/auth'
import { getAllSettings, getSetting, setSetting, setSettings } from '../services/settings'

const settings = new Hono()

// All settings endpoints require admin (group 0)
settings.use('*', authMiddleware(), requireGroup(0))

// GET /api/settings — Get all settings
settings.get('/', async (c) => {
  const all = await getAllSettings()
  return c.json({ data: all })
})

// GET /api/settings/:key — Get single setting
settings.get('/:key', async (c) => {
  const key = c.req.param('key')
  const value = await getSetting(key)

  if (value === null) {
    return c.json({
      error: { code: 'NOT_FOUND', message: `Setting '${key}' not found` },
    }, 404)
  }

  return c.json({ data: { key, value } })
})

// PUT /api/settings/:key — Set single setting
settings.put('/:key', async (c) => {
  const key = c.req.param('key')
  const body = await c.req.json()
  const parsed = updateSettingRequestSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
    }, 400)
  }

  const { value } = parsed.data

  // Handle null as deletion (if value is nullable)
  if (value === null) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: 'Value cannot be null. Use DELETE to remove a setting.' },
    }, 400)
  }

  await setSetting(key, value)

  return c.json({ data: { key, value } })
})

// PUT /api/settings — Bulk update settings
settings.put('/', async (c) => {
  const body = await c.req.json()

  if (typeof body !== 'object' || body === null || !body.settings) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: 'Body must be { settings: { key: value, ... } }' },
    }, 400)
  }

  const { settings: settingsObj } = body as { settings: unknown }

  if (typeof settingsObj !== 'object' || settingsObj === null) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: 'settings must be an object' },
    }, 400)
  }

  const record = settingsObj as Record<string, unknown>

  // Validate all values are strings
  for (const [key, val] of Object.entries(record)) {
    if (typeof val !== 'string') {
      return c.json({
        error: { code: 'VALIDATION_ERROR', message: `Value for '${key}' must be a string` },
      }, 400)
    }
  }

  await setSettings(record as Record<string, string>)

  return c.json({ data: { updated: Object.keys(record).length } })
})

export default settings
