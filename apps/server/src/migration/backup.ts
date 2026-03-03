import { copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DATA_DIR = process.env.DATA_DIR ?? './data'
const BACKUPS_DIR = join(DATA_DIR, 'backups')

export function createBackup(sourcePath: string): string {
  if (!existsSync(sourcePath)) {
    throw new Error(`Source database not found at: ${sourcePath}`)
  }

  mkdirSync(BACKUPS_DIR, { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupName = `organizr-backup-${timestamp}.db`
  const backupPath = join(BACKUPS_DIR, backupName)

  copyFileSync(sourcePath, backupPath)

  if (!existsSync(backupPath)) {
    throw new Error(`Backup verification failed: file not found at ${backupPath}`)
  }

  return backupPath
}
