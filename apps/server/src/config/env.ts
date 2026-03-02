import { z } from 'zod'

const dialectEnum = z.enum(['sqlite', 'mysql', 'postgresql'])

export type DatabaseDialect = z.infer<typeof dialectEnum>

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_DIALECT: dialectEnum.default('sqlite'),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32).optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

export type Env = z.infer<typeof envSchema>

/**
 * Validates environment variables and returns a typed env object.
 * Throws with a clear, multi-line error if validation fails.
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(Bun.env)

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(
      `Environment validation failed:\n${errors}\n\nCheck your .env file or environment variables.`
    )
  }

  const env = result.data

  // JWT_SECRET is required in production
  if (env.NODE_ENV === 'production' && !env.JWT_SECRET) {
    throw new Error(
      'JWT_SECRET is required in production. Set a secure string of at least 32 characters.'
    )
  }

  // Provide a dev-only default for JWT_SECRET
  if (!env.JWT_SECRET) {
    env.JWT_SECRET = 'dev-secret-do-not-use-in-production!!'
  }

  // Default DATABASE_URL based on dialect
  if (!env.DATABASE_URL) {
    switch (env.DATABASE_DIALECT) {
      case 'sqlite':
        env.DATABASE_URL = './data/organizr.db'
        break
      case 'mysql':
        env.DATABASE_URL = 'mysql://root:password@localhost:3306/organizr'
        break
      case 'postgresql':
        env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/organizr'
        break
    }
  }

  return Object.freeze(env) as Env
}
