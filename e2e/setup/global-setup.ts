import { mkdirSync, readdirSync, readFileSync, rmSync } from 'fs'
import { resolve } from 'path'
import { seedE2eData } from './seed'

const dbPath = '/tmp/e2e-organizrx.db'
const readyPath = '/tmp/e2e-organizrx.ready'
const migrationsDir = resolve(process.cwd(), 'apps/server/drizzle')
const authDir = resolve(process.cwd(), 'e2e/.auth')

function splitStatements(sql: string): string[] {
  return sql
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)
}

export default async function globalSetup() {
  const { Database } = await import('bun:sqlite')

  rmSync(readyPath, { force: true })
  rmSync(dbPath, { force: true })
  rmSync(authDir, { recursive: true, force: true })
  mkdirSync(authDir, { recursive: true })

  const db = new Database(dbPath)

  try {
    const migrationFiles = readdirSync(migrationsDir)
      .filter((file: string) => file.endsWith('.sql'))
      .sort()

    for (const migrationFile of migrationFiles) {
      const migrationSql = readFileSync(resolve(migrationsDir, migrationFile), 'utf8')

      for (const statement of splitStatements(migrationSql)) {
        db.run(statement)
      }
    }

    await seedE2eData(db)
    await Bun.write(readyPath, 'ready')
  } finally {
    db.close()
  }
}
