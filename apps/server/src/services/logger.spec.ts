import { describe, expect, it, beforeEach, afterEach } from 'bun:test'

describe('logger', () => {
  const originalLogLevel = process.env.LOG_LEVEL

  beforeEach(() => {
    delete process.env.LOG_LEVEL
  })

  afterEach(() => {
    if (originalLogLevel !== undefined) {
      process.env.LOG_LEVEL = originalLogLevel
    } else {
      delete process.env.LOG_LEVEL
    }
  })

  it('exports getLogger and createChildLogger functions', async () => {
    const mod = await import('./logger')
    expect(typeof mod.getLogger).toBe('function')
    expect(typeof mod.createChildLogger).toBe('function')
    expect(typeof mod.closeLogger).toBe('function')
  })

  it('creates a pino logger with standard log methods', async () => {
    const { getLogger } = await import('./logger')
    const logger = getLogger()
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.debug).toBe('function')
    expect(typeof logger.fatal).toBe('function')
  })

  it('defaults to info level when LOG_LEVEL is not set', async () => {
    delete process.env.LOG_LEVEL
    const { getLogger, closeLogger } = await import('./logger')
    await closeLogger()
    const logger = getLogger()
    expect(logger.level).toBe('info')
  })

  it('creates child loggers with component context', async () => {
    const { createChildLogger } = await import('./logger')
    const child = createChildLogger('test-component')
    expect(typeof child.info).toBe('function')
    expect(
      (child as unknown as { bindings: () => Record<string, unknown> }).bindings().component
    ).toBe('test-component')
  })

  it('uses stdout transport only (no file transport)', async () => {
    const { getLogger } = await import('./logger')
    const logger = getLogger()
    expect(logger.level).toBeDefined()
    const loggerAny = logger as unknown as Record<string, unknown>
    expect(loggerAny['transport']).toBeUndefined()
  })
})
