import { Hono, type Context } from 'hono'
import { testConnectionRequestSchema } from '@organizrx/shared'
import { authMiddleware, requireGroup, type AuthVariables } from '../middleware/auth'
import { testConnection } from '../services/connection-tester'

const connectionTester = new Hono()

// Admin/Co-Admin only (group_id <= 1)
connectionTester.use('*', authMiddleware(), requireGroup(1))

// POST / — test a connection
connectionTester.post('/', async (c: Context<{ Variables: AuthVariables }>) => {
  try {
    const body = await c.req.json()

    // Validate request
    const parseResult = testConnectionRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.issues[0]?.message || 'Invalid request',
          },
        },
        400
      )
    }

    const user = c.get('user')
    const userId = user.userID

    // Test the connection
    try {
      const result = await testConnection(parseResult.data, userId)

      return c.json({
        data: {
          success: result.success,
          latencyMs: result.latencyMs,
          statusCode: result.statusCode,
          error: result.error,
        },
      })
    } catch (error) {
      let errorCode = 'INTERNAL_ERROR'
      let errorMessage = 'An error occurred'

      if (error instanceof Error) {
        if (error.message.startsWith('SSRF_BLOCKED:')) {
          errorCode = 'SSRF_BLOCKED'
          errorMessage = error.message.replace('SSRF_BLOCKED: ', '')
        } else if (error.message === 'RATE_LIMITED') {
          return c.json(
            {
              error: {
                code: 'RATE_LIMITED',
                message: 'Too many test requests. Maximum 5 per minute allowed.',
              },
            },
            429
          )
        } else {
          errorMessage = error.message
        }
      }

      return c.json(
        {
          error: {
            code: errorCode,
            message: errorMessage,
          },
        },
        400
      )
    }
  } catch (error) {
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to parse request',
        },
      },
      400
    )
  }
})

export default connectionTester
