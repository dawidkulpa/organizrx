/**
 * Drizzle config - Reads DATABASE_DIALECT from env and selects appropriate schema.
 * Supports sqlite, mysql, postgresql.
 */

import { defineConfig } from 'drizzle-kit';

const dialect = process.env.DATABASE_DIALECT || 'sqlite';

const schemaMap = {
  sqlite: './src/db/schema/sqlite.ts',
  mysql: './src/db/schema/mysql.ts',
  postgresql: './src/db/schema/pg.ts',
} as const;

if (!['sqlite', 'mysql', 'postgresql'].includes(dialect)) {
  throw new Error(`Invalid DATABASE_DIALECT: ${dialect}. Must be sqlite, mysql, or postgresql.`);
}

export default defineConfig({
  schema: schemaMap[dialect as keyof typeof schemaMap],
  out: './drizzle',
  dialect: dialect as 'sqlite' | 'mysql' | 'postgresql',
});
