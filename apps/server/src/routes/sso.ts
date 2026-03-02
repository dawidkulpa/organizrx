import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, requireGroup } from '../middleware/auth'
import {
  getSsoConfig,
  getSsoCookies,
  buildSetCookieHeaders,
  DEFAULT_SSO_SERVICES,
} from '../services/sso'
import { setSetting } from '../services/settings'

const sso = new Hono()

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const updateSsoConfigSchema = z.object({
  service: z.string().min(1),
  enabled: z.boolean().optional(),
  cookie_name: z.string().optional(),
  cookie_domain: z.string().optional(),
  cookie_path: z.string().optional(),
})

// ---------------------------------------------------------------------------
// GET /api/sso/services — list all SSO-configurable services (admin-only)
// ---------------------------------------------------------------------------

sso.get('/services', authMiddleware(), requireGroup(0), async (c) => {
  const services = DEFAULT_SSO_SERVICES.map((service) => ({
    name: service.name,
    description: service.description,
    cookie_name: service.cookie_name,
    cookie_domain: service.cookie_domain,
    cookie_path: service.cookie_path,
    token_source: service.token_source,
  }))

  return c.json({
    data: {
      services,
    },
  })
})

// ---------------------------------------------------------------------------
// GET /api/sso/config — get current SSO configuration (admin-only)
// ---------------------------------------------------------------------------

sso.get('/config', authMiddleware(), requireGroup(0), async (c) => {
  const config = await getSsoConfig()

  return c.json({
    data: {
      config,
    },
  })
})

// ---------------------------------------------------------------------------
// PUT /api/sso/config — update SSO config per service (admin-only)
// ---------------------------------------------------------------------------

sso.put('/config', authMiddleware(), requireGroup(0), async (c) => {
  const body = await c.req.json()
  const parsed = updateSsoConfigSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
      },
      400
    )
  }

  const { service, enabled, cookie_name, cookie_domain, cookie_path } = parsed.data

  // Validate that the service exists in our default list
  const serviceExists = DEFAULT_SSO_SERVICES.some((s) => s.name === service)
  if (!serviceExists) {
    return c.json(
      {
        error: { code: 'INVALID_SERVICE', message: `Service '${service}' is not supported` },
      },
      400
    )
  }

  // Update settings
  if (enabled !== undefined) {
    await setSetting(`sso_${service}_enabled`, enabled ? '1' : '0')
  }
  if (cookie_name !== undefined) {
    await setSetting(`sso_${service}_cookie_name`, cookie_name)
  }
  if (cookie_domain !== undefined) {
    await setSetting(`sso_${service}_cookie_domain`, cookie_domain)
  }
  if (cookie_path !== undefined) {
    await setSetting(`sso_${service}_cookie_path`, cookie_path)
  }

  // Return updated config
  const config = await getSsoConfig()
  const updatedService = config.find((s) => s.name === service)

  return c.json({
    data: {
      service: updatedService,
    },
  })
})

// ---------------------------------------------------------------------------
// GET /api/sso/cookies — get current SSO cookies for authenticated user
// ---------------------------------------------------------------------------

sso.get('/cookies', authMiddleware(), async (c) => {
  const tokenUser = c.get('user')
  const cookies = await getSsoCookies(tokenUser.userID)
  const headers = buildSetCookieHeaders(cookies)

  return c.json({
    data: {
      cookies: cookies.map((cookie) => ({
        name: cookie.name,
        domain: cookie.domain,
        path: cookie.path,
        maxAge: cookie.maxAge,
      })),
      headers,
    },
  })
})

export default sso
