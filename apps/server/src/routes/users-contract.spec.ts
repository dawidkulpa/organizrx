import { describe, expect, it } from 'bun:test'

import { updateUserRequestSchema } from '@organizrx/shared'

describe('users update contract', () => {
  it('accepts the locked field used by the users management UI', () => {
    const parsed = updateUserRequestSchema.safeParse({
      locked: 1,
      group_id: 0,
    })

    expect(parsed.success).toBe(true)
  })
})
