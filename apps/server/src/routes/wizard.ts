import { Hono } from 'hono'
import { z } from 'zod'
import { listUsers, createUser } from '../services/users'
import { hashPassword } from '../services/auth'
import { setSettings } from '../services/settings'
import { createTab } from '../services/tabs'
import { resetSetupCache } from '../services/setup'

const wizard = new Hono()

// ── GET /api/wizard/status ─────────────────────────────────────
// Returns whether the application needs initial setup (no users exist).
wizard.get('/status', async (c) => {
  try {
    const { total } = await listUsers(1, 1)
    return c.json({
      data: { needsSetup: total === 0 },
    })
  } catch {
    // DB not ready (table missing, first-run) — treat as needs setup
    return c.json({
      data: { needsSetup: true },
    })
  }
})

// ── Wizard completion schema ───────────────────────────────────
const wizardCompleteSchema = z.object({
  // Admin user
  username: z.string().min(3).max(64),
  password: z.string().min(8).max(128),
  email: z.string().email().optional(),

  // Basic settings
  siteTitle: z.string().min(1).max(128).optional(),

  // Database (informational — connection is already established)
  dbDialect: z.enum(['sqlite', 'mysql', 'postgresql']).optional(),
})

// ── POST /api/wizard/complete ──────────────────────────────────
// Creates the admin user and saves initial settings. Only works
// when no users exist yet (first-run guard).
wizard.post('/complete', async (c) => {
  // Guard: only allow wizard when no users exist
  const { total } = await listUsers(1, 1)
  if (total > 0) {
    return c.json(
      { error: { code: 'WIZARD_COMPLETED', message: 'Setup has already been completed' } },
      403,
    )
  }

  const body = await c.req.json()
  const parsed = wizardCompleteSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } },
      400,
    )
  }

  const { username, password, email, siteTitle } = parsed.data

  // Create admin user (group_id 0 = admin)
  const hashedPassword = await hashPassword(password)
  const adminUser = await createUser({
    username,
    password: hashedPassword,
    email: email ?? null,
    groupName: 'Admin',
    group_id: 0,
  })

  // Save initial settings
  const initialSettings: Record<string, string> = {
    WIZARD_COMPLETED: 'true',
  }
  if (siteTitle) {
    initialSettings.SITE_TITLE = siteTitle
  }
  await setSettings(initialSettings)

  // Seed internal tabs (Dashboard, Settings, Users)
  await createTab({
    name: 'Dashboard',
    url: '/',
    type: 0,
    order: 0,
    category_id: null,
    group_id: 999,
    enabled: 1,
    isDefault: 1,
    image: 'fa-home',
  })
  await createTab({
    name: 'Settings',
    url: '/settings',
    type: 0,
    order: 1,
    category_id: null,
    group_id: 0,
    enabled: 1,
    isDefault: 1,
    image: 'fa-cog',
  })
  await createTab({
    name: 'Users',
    url: '/users',
    type: 0,
    order: 2,
    category_id: null,
    group_id: 0,
    enabled: 1,
    isDefault: 1,
    image: 'fa-users',
  })

  // Reset the cached setup status so the redirect middleware
  // knows setup is complete and stops redirecting to /wizard.
  resetSetupCache()
  return c.json({
    data: {
      success: true,
      user: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
      },
    },
  })
})

export default wizard
