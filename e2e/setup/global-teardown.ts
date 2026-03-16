import { existsSync, rmSync } from 'fs'

export default async function globalTeardown() {
  const dbPath = '/tmp/e2e-organizrx.db'
  if (existsSync(dbPath)) rmSync(dbPath)
}
