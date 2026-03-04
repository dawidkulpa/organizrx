import { Hono } from 'hono'
import { authMiddleware, requireGroup } from '../middleware/auth'
import { checkForUpdate, getChangelog } from '../services/updater'

const update = new Hono()

// ALL update endpoints are admin-only (group 0)
update.use('*', authMiddleware(), requireGroup(0))

// GET / — check for updates (cached or fresh)
update.get('/', async (c) => {
  try {
    const result = await checkForUpdate()
    return c.json({ data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to check for updates'
    return c.json({ error: { code: 'UPDATE_CHECK_FAILED', message } }, 500)
  }
})

// GET /changelog — latest release notes from GitHub
update.get('/changelog', async (c) => {
  try {
    const result = await getChangelog()
    return c.json({ data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch changelog'
    return c.json({ error: { code: 'CHANGELOG_FETCH_FAILED', message } }, 500)
  }
})

export default update
