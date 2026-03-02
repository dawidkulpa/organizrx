import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, requireGroup } from '../middleware/auth'
import { setSetting, getAllSettings } from '../services/settings'
import {
  searchAvailablePlugins,
  getInstalledPlugins,
  installPlugin,
  removePlugin,
  updatePlugin,
  getNeedsRestart,
  validatePluginName,
} from '../plugins/registry'

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const installBodySchema = z.object({
  name: z.string().regex(/^[a-z0-9-]+$/, 'Plugin name must be lowercase alphanumeric with dashes'),
})

const pluginNameParamSchema = z.string().regex(
  /^[a-z0-9-]+$/,
  'Plugin name must be lowercase alphanumeric with dashes',
)

const configUpdateSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean()]),
)

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const plugins = new Hono()

// All plugin management endpoints require authentication
plugins.use('*', authMiddleware())

// ---------------------------------------------------------------------------
// GET /api/plugins — List installed plugins with status
// ---------------------------------------------------------------------------

plugins.get('/', (c) => {
  const installed = getInstalledPlugins()
  return c.json({
    data: {
      plugins: installed,
      needsRestart: getNeedsRestart(),
    },
  })
})

// ---------------------------------------------------------------------------
// GET /api/plugins/available — Search npm registry for available plugins
// ---------------------------------------------------------------------------

plugins.get('/available', async (c) => {
  const query = c.req.query('q')

  try {
    const available = await searchAvailablePlugins(query)
    return c.json({ data: available })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({
      error: { code: 'REGISTRY_ERROR', message },
    }, 502)
  }
})

// ---------------------------------------------------------------------------
// POST /api/plugins/install — Install a plugin (admin only)
// ---------------------------------------------------------------------------

plugins.post('/install', requireGroup(0), async (c) => {
  const body = await c.req.json()
  const parsed = installBodySchema.safeParse(body)

  if (!parsed.success) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
    }, 400)
  }

  try {
    validatePluginName(parsed.data.name)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({
      error: { code: 'VALIDATION_ERROR', message },
    }, 400)
  }

  try {
    const result = await installPlugin(parsed.data.name)

    if (!result.success) {
      return c.json({
        error: {
          code: 'INSTALL_FAILED',
          message: `Failed to install plugin: ${result.output}`,
        },
      }, 500)
    }

    return c.json({
      data: {
        installed: `@organizrx/plugin-${parsed.data.name}`,
        needsRestart: true,
        output: result.output,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({
      error: { code: 'INSTALL_FAILED', message },
    }, 500)
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/plugins/:name — Uninstall a plugin (admin only)
// ---------------------------------------------------------------------------

plugins.delete('/:name', requireGroup(0), async (c) => {
  const nameParam = c.req.param('name')
  const parsedName = pluginNameParamSchema.safeParse(nameParam)

  if (!parsedName.success) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: parsedName.error.issues[0].message },
    }, 400)
  }

  try {
    validatePluginName(parsedName.data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({
      error: { code: 'VALIDATION_ERROR', message },
    }, 400)
  }

  try {
    const result = await removePlugin(parsedName.data)

    if (!result.success) {
      return c.json({
        error: {
          code: 'REMOVE_FAILED',
          message: `Failed to remove plugin: ${result.output}`,
        },
      }, 500)
    }

    return c.json({
      data: {
        removed: `@organizrx/plugin-${parsedName.data}`,
        needsRestart: true,
        output: result.output,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({
      error: { code: 'REMOVE_FAILED', message },
    }, 500)
  }
})

// ---------------------------------------------------------------------------
// POST /api/plugins/:name/update — Update plugin to latest (admin only)
// ---------------------------------------------------------------------------

plugins.post('/:name/update', requireGroup(0), async (c) => {
  const nameParam = c.req.param('name')
  const parsedName = pluginNameParamSchema.safeParse(nameParam)

  if (!parsedName.success) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: parsedName.error.issues[0].message },
    }, 400)
  }

  try {
    validatePluginName(parsedName.data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({
      error: { code: 'VALIDATION_ERROR', message },
    }, 400)
  }

  try {
    const result = await updatePlugin(parsedName.data)

    if (!result.success) {
      return c.json({
        error: {
          code: 'UPDATE_FAILED',
          message: `Failed to update plugin: ${result.output}`,
        },
      }, 500)
    }

    return c.json({
      data: {
        updated: `@organizrx/plugin-${parsedName.data}`,
        needsRestart: true,
        output: result.output,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({
      error: { code: 'UPDATE_FAILED', message },
    }, 500)
  }
})

// ---------------------------------------------------------------------------
// GET /api/plugins/:name/config — Get plugin settings (admin only)
// ---------------------------------------------------------------------------

plugins.get('/:name/config', requireGroup(0), async (c) => {
  const nameParam = c.req.param('name')
  const parsedName = pluginNameParamSchema.safeParse(nameParam)

  if (!parsedName.success) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: parsedName.error.issues[0].message },
    }, 400)
  }

  const pluginId = parsedName.data
  const prefix = `plugin:${pluginId}:`

  const allSettings = await getAllSettings()
  const pluginConfig: Record<string, string> = {}

  for (const [key, value] of Object.entries(allSettings)) {
    if (key.startsWith(prefix)) {
      pluginConfig[key.slice(prefix.length)] = value
    }
  }

  return c.json({ data: pluginConfig })
})

// ---------------------------------------------------------------------------
// PUT /api/plugins/:name/config — Update plugin settings (admin only)
// ---------------------------------------------------------------------------

plugins.put('/:name/config', requireGroup(0), async (c) => {
  const nameParam = c.req.param('name')
  const parsedName = pluginNameParamSchema.safeParse(nameParam)

  if (!parsedName.success) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: parsedName.error.issues[0].message },
    }, 400)
  }

  const body = await c.req.json()
  const parsedConfig = configUpdateSchema.safeParse(body)

  if (!parsedConfig.success) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: parsedConfig.error.issues[0].message },
    }, 400)
  }

  const pluginId = parsedName.data
  const prefix = `plugin:${pluginId}:`

  for (const [key, value] of Object.entries(parsedConfig.data)) {
    await setSetting(`${prefix}${key}`, String(value))
  }

  return c.json({
    data: { updated: Object.keys(parsedConfig.data).length },
  })
})

export default plugins
