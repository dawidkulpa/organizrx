import { Database } from 'bun:sqlite'

export const DB_PATH = '/tmp/e2e-organizrx.db'

export async function seedDatabase(dbPath = DB_PATH) {
  const db = new Database(dbPath)

  const adminHash = await Bun.password.hash('TestPassword123!', {
    algorithm: 'bcrypt',
    cost: 12,
  })
  const userHash = await Bun.password.hash('TestPassword123!', {
    algorithm: 'bcrypt',
    cost: 12,
  })

  const insertUser = db.prepare(
    'INSERT OR IGNORE INTO users (username, password, email, "group", group_id, locked, auth_service) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  insertUser.run('admin', adminHash, 'admin@e2e.test', 'Admin', 1, 0, 'internal')
  insertUser.run('testuser', userHash, 'testuser@e2e.test', 'User', 5, 0, 'internal')

  const insertTab = db.prepare(
    'INSERT OR IGNORE INTO tabs (name, url, enabled, group_id, "order", type) VALUES (?, ?, ?, ?, ?, ?)'
  )
  insertTab.run('Tab1', 'https://example.com', 1, 1, 1, 1)
  insertTab.run('Tab2', 'https://example.org', 1, 1, 2, 1)
  insertTab.run('Tab3', 'https://httpbin.org', 1, 1, 3, 1)

  db.close()
}
