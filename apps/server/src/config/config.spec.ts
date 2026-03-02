import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { envSchema, validateEnv } from './env'
import { loadConfig, configSchema } from './config'
import { getSetting, setSetting, getSettingTyped, getSettings } from './settings'
import { initConfig, getConfig, getEnv, _resetConfig } from './index'
import { z } from 'zod'

// ============================================
// Tier 1: Environment Variables
// ============================================

describe('env', () => {
  const originalEnv = { ...Bun.env }

  afterEach(() => {
    // Restore original env
    for (const key of Object.keys(Bun.env)) {
      if (!(key in originalEnv)) {
        delete Bun.env[key]
      }
    }
    for (const [key, value] of Object.entries(originalEnv)) {
      Bun.env[key] = value
    }
  })

  it('should parse valid env with defaults', () => {
    const result = envSchema.safeParse({
      NODE_ENV: 'development',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.PORT).toBe(3001)
      expect(result.data.HOST).toBe('0.0.0.0')
      expect(result.data.DATABASE_DIALECT).toBe('sqlite')
      expect(result.data.NODE_ENV).toBe('development')
      expect(result.data.LOG_LEVEL).toBe('info')
    }
  })

  it('should coerce PORT from string to number', () => {
    const result = envSchema.safeParse({ PORT: '8080' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.PORT).toBe(8080)
    }
  })

  it('should reject invalid DATABASE_DIALECT', () => {
    const result = envSchema.safeParse({ DATABASE_DIALECT: 'mongodb' })
    expect(result.success).toBe(false)
  })

  it('should reject JWT_SECRET shorter than 32 chars', () => {
    const result = envSchema.safeParse({ JWT_SECRET: 'short' })
    expect(result.success).toBe(false)
  })

  it('should accept JWT_SECRET of 32+ chars', () => {
    const result = envSchema.safeParse({
      JWT_SECRET: 'a'.repeat(32),
    })
    expect(result.success).toBe(true)
  })

  it('validateEnv should throw in production without JWT_SECRET', () => {
    Bun.env.NODE_ENV = 'production'
    delete Bun.env.JWT_SECRET
    expect(() => validateEnv()).toThrow('JWT_SECRET is required in production')
  })

  it('validateEnv should provide dev default for JWT_SECRET', () => {
    Bun.env.NODE_ENV = 'development'
    delete Bun.env.JWT_SECRET
    const env = validateEnv()
    expect(env.JWT_SECRET).toBe('dev-secret-do-not-use-in-production!!')
  })

  it('validateEnv should default DATABASE_URL for sqlite', () => {
    Bun.env.NODE_ENV = 'test'
    delete Bun.env.JWT_SECRET
    delete Bun.env.DATABASE_URL
    Bun.env.DATABASE_DIALECT = 'sqlite'
    const env = validateEnv()
    expect(env.DATABASE_URL).toBe('./data/organizr.db')
  })
})

// ============================================
// Tier 2: Config File
// ============================================

describe('config', () => {
  it('should use all defaults when no config file exists', async () => {
    const config = await loadConfig()
    expect(config.auth.loginAttempts).toBe(5)
    expect(config.auth.bcryptRounds).toBe(12)
    expect(config.auth.refreshTokenExpiryDays).toBe(7)
    expect(config.server.corsOrigins).toEqual(['http://localhost:5173'])
    expect(config.server.trustProxy).toBe(false)
    expect(config.logging.level).toBe('info')
    expect(config.logging.maxLogFiles).toBe(7)
    expect(config.security.rateLimitMaxRequests).toBe(100)
    expect(config.security.iframeSandbox).toBe('allow-scripts allow-same-origin allow-popups')
  })

  it('should override logging.level with env LOG_LEVEL', async () => {
    const config = await loadConfig('debug')
    expect(config.logging.level).toBe('debug')
  })

  it('should not override logging.level with invalid env LOG_LEVEL', async () => {
    const config = await loadConfig('verbose')
    expect(config.logging.level).toBe('info')
  })

  it('configSchema should validate partial configs', () => {
    const result = configSchema.safeParse({
      auth: { loginAttempts: 10 },
    })
    expect(result.success).toBe(true)
  })

  it('configSchema should reject invalid types', () => {
    const result = configSchema.safeParse({
      auth: { loginAttempts: 'five' },
    })
    expect(result.success).toBe(false)
  })
})

// ============================================
// Tier 3: DB Runtime Settings
// ============================================

describe('settings', () => {
  function createMockDb() {
    const store = new Map<string, string>()

    return {
      store,
      select() {
        return {
          from(_table: unknown) {
            return {
              where(condition: unknown) {
                // Extract key from condition via closure
                return {
                  async get() {
                    const key = (condition as { key: string }).key
                    const value = store.get(key)
                    return value !== undefined ? { name: key, value } : undefined
                  },
                }
              },
              async all() {
                return Array.from(store.entries()).map(([name, value]) => ({ name, value }))
              },
            }
          },
        }
      },
      insert(_table: unknown) {
        return {
          values(data: { name: string; value: string }) {
            return {
              onConflictDoUpdate(_config: unknown) {
                return {
                  async run() {
                    store.set(data.name, data.value)
                  },
                }
              },
            }
          },
        }
      },
      delete(_table: unknown) {
        return {
          where(condition: unknown) {
            return {
              async run() {
                const key = (condition as { key: string }).key
                store.delete(key)
              },
            }
          },
        }
      },
    }
  }

  // Since the real functions use drizzle's `eq()` which generates
  // internal condition objects, we test the function signatures
  // and types rather than full integration (which needs a real DB).

  it('getSetting should return null for missing keys', async () => {
    // Simplified mock that works with the actual function signature
    const mockDb = {
      select() {
        return {
          from() {
            return {
              where() {
                return {
                  async get() {
                    return undefined
                  },
                }
              },
            }
          },
        }
      },
    }
    const mockTable = { name: {} }
    const result = await getSetting(mockDb as never, mockTable as never, 'nonexistent')
    expect(result).toBeNull()
  })

  it('getSetting should return value for existing keys', async () => {
    const mockDb = {
      select() {
        return {
          from() {
            return {
              where() {
                return {
                  async get() {
                    return { name: 'title', value: 'My Dashboard' }
                  },
                }
              },
            }
          },
        }
      },
    }
    const mockTable = { name: {} }
    const result = await getSetting(mockDb as never, mockTable as never, 'title')
    expect(result).toBe('My Dashboard')
  })

  it('setSetting should call insert with onConflictDoUpdate', async () => {
    let insertedData: unknown = null
    const mockDb = {
      insert() {
        return {
          values(data: unknown) {
            insertedData = data
            return {
              onConflictDoUpdate() {
                return {
                  async run() {},
                }
              },
            }
          },
        }
      },
    }
    const mockTable = { name: {} }
    await setSetting(mockDb as never, mockTable as never, 'title', 'New Title')
    expect(insertedData).toEqual({ name: 'title', value: 'New Title' })
  })

  it('getSettings should return all settings as map', async () => {
    const mockDb = {
      select() {
        return {
          from() {
            return {
              async all() {
                return [
                  { name: 'title', value: 'Dashboard' },
                  { name: 'theme', value: 'dark' },
                ]
              },
            }
          },
        }
      },
    }
    const mockTable = { name: {} }
    const result = await getSettings(mockDb as never, mockTable as never)
    expect(result).toEqual({ title: 'Dashboard', theme: 'dark' })
  })

  it('getSettingTyped should parse with schema and return typed value', async () => {
    const mockDb = {
      select() {
        return {
          from() {
            return {
              where() {
                return {
                  async get() {
                    return { name: 'rateLimitMax', value: '200' }
                  },
                }
              },
            }
          },
        }
      },
    }
    const mockTable = { name: {} }
    const result = await getSettingTyped(
      mockDb as never,
      mockTable as never,
      'rateLimitMax',
      z.number(),
      100
    )
    expect(result).toBe(200)
  })

  it('getSettingTyped should return default when value fails validation', async () => {
    const mockDb = {
      select() {
        return {
          from() {
            return {
              where() {
                return {
                  async get() {
                    return { name: 'count', value: 'not-a-number' }
                  },
                }
              },
            }
          },
        }
      },
    }
    const mockTable = { name: {} }
    const result = await getSettingTyped(
      mockDb as never,
      mockTable as never,
      'count',
      z.number(),
      42
    )
    expect(result).toBe(42)
  })
})

// ============================================
// Unified Config (index.ts)
// ============================================

describe('initConfig', () => {
  beforeEach(() => {
    _resetConfig()
  })

  afterEach(() => {
    _resetConfig()
  })

  it('getConfig should throw before init', () => {
    expect(() => getConfig()).toThrow('Config not initialized')
  })

  it('getEnv should throw before init', () => {
    expect(() => getEnv()).toThrow('Config not initialized')
  })

  it('initConfig should populate env and config', async () => {
    Bun.env.NODE_ENV = 'test'
    delete Bun.env.JWT_SECRET
    const { env, config } = await initConfig()
    expect(env.PORT).toBe(3001)
    expect(config.auth.loginAttempts).toBe(5)
    expect(getEnv()).toBe(env)
    expect(getConfig()).toBe(config)
  })
})
