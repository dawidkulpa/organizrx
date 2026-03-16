interface DatabaseLike {
  prepare(sql: string): {
    run(...params: unknown[]): unknown
  }
}

const testPassword = 'TestPassword123!'

export async function seedE2eData(db: DatabaseLike) {
  const timestamp = new Date().toISOString()
  const adminPassword = await Bun.password.hash(testPassword, { algorithm: 'bcrypt', cost: 12 })
  const userPassword = await Bun.password.hash(testPassword, { algorithm: 'bcrypt', cost: 12 })

  const insertGroup = db.prepare(
    'INSERT INTO groups ("group", group_id, image, "default") VALUES (?, ?, ?, ?)'
  )
  const insertUser = db.prepare(
    'INSERT INTO users (username, password, email, plex_token, "group", group_id, locked, image, register_date, auth_service, totp_secret, totp_enabled, totp_backup_codes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )
  const insertTab = db.prepare(
    'INSERT INTO tabs ("order", category_id, name, url, url_local, "default", enabled, group_id, group_id_max, add_to_admin, image, type, splash, ping, ping_url, timeout, timeout_ms, preload) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )
  const insertOption = db.prepare('INSERT INTO options (name, value) VALUES (?, ?)')

  insertGroup.run('Admin', 0, null, 0)
  insertGroup.run('User', 5, null, 1)
  insertGroup.run('Guest', 999, null, 0)

  insertUser.run(
    'admin',
    adminPassword,
    'admin@e2e.test',
    null,
    'Admin',
    0,
    0,
    null,
    timestamp,
    'internal',
    null,
    0,
    null
  )
  insertUser.run(
    'testuser',
    userPassword,
    'testuser@e2e.test',
    null,
    'User',
    5,
    0,
    null,
    timestamp,
    'internal',
    null,
    0,
    null
  )

  insertTab.run(
    1,
    null,
    'Tab1',
    'https://example.com',
    null,
    0,
    1,
    1,
    0,
    0,
    null,
    1,
    0,
    0,
    null,
    null,
    null,
    0
  )
  insertTab.run(
    2,
    null,
    'Tab2',
    'https://example.org',
    null,
    0,
    1,
    1,
    0,
    0,
    null,
    1,
    0,
    0,
    null,
    null,
    null,
    0
  )
  insertTab.run(
    3,
    null,
    'Tab3',
    'https://httpbin.org',
    null,
    0,
    1,
    1,
    0,
    0,
    null,
    1,
    0,
    0,
    null,
    null,
    null,
    0
  )

  insertOption.run('wizardCompleted', 'true')
  insertOption.run('siteTitle', 'OrganizrX')
}
