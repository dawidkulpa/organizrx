import { existsSync, mkdirSync, readFileSync, rmSync } from 'fs'
import { resolve } from 'path'
import { Database } from 'bun:sqlite'
import { seedDatabase } from './seed'

const DB_PATH = '/tmp/e2e-organizrx.db'

function runMigrationFile(db: Database, fileName: string) {
  const migration = readFileSync(resolve(process.cwd(), 'apps/server/drizzle', fileName), 'utf-8')

  for (const statement of migration.split('--> statement-breakpoint')) {
    const sql = statement.trim()
    if (sql) db.run(sql)
  }
}

export default async function globalSetup() {
  mkdirSync('e2e/.auth', { recursive: true })

  if (existsSync(DB_PATH)) rmSync(DB_PATH)

  const db = new Database(DB_PATH)

  runMigrationFile(db, '0000_young_young_avengers.sql')
  runMigrationFile(db, '0001_wandering_hellion.sql')

  db.close()

  await seedDatabase(DB_PATH)
}
