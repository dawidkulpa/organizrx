/**
 * Seed script for default groups.
 * Creates 6 groups with exact IDs matching legacy Organizr schema.
 */

import { getRawDb, getDialect } from './connection'
import type { SqliteDb, MysqlDb, PostgresDb } from './connection'
import * as sqliteSchema from './schema/sqlite'
import * as mysqlSchema from './schema/mysql'
import * as pgSchema from './schema/pg'

export interface GroupSeed {
  group: string
  group_id: number
  default: number
  image: string
}

export const defaultGroups: GroupSeed[] = [
  {
    group: 'Admin',
    group_id: 0,
    default: 0,
    image: 'plugins/images/groups/admin.png',
  },
  {
    group: 'Co-Admin',
    group_id: 1,
    default: 0,
    image: 'plugins/images/groups/coadmin.png',
  },
  {
    group: 'Super User',
    group_id: 2,
    default: 0,
    image: 'plugins/images/groups/superuser.png',
  },
  {
    group: 'Power User',
    group_id: 3,
    default: 0,
    image: 'plugins/images/groups/poweruser.png',
  },
  {
    group: 'User',
    group_id: 4,
    default: 1,
    image: 'plugins/images/groups/user.png',
  },
  {
    group: 'Guest',
    group_id: 999,
    default: 0,
    image: 'plugins/images/groups/guest.png',
  },
]

/**
 * Seeds the groups table with default groups.
 * Dispatches to the correct dialect-specific insert based on the active dialect.
 */
export async function seedDefaultGroups(): Promise<void> {
  const db = getRawDb()
  const dialect = getDialect()

  for (const group of defaultGroups) {
    try {
      switch (dialect) {
        case 'sqlite': {
          const sqliteDb = db as SqliteDb
          await sqliteDb.insert(sqliteSchema.groups).values(group).onConflictDoNothing()
          break
        }
        case 'mysql': {
          const mysqlDb = db as MysqlDb
          await mysqlDb.insert(mysqlSchema.groups).values(group).onDuplicateKeyUpdate({ set: { group: group.group } })
          break
        }
        case 'postgresql': {
          const pgDb = db as PostgresDb
          await pgDb.insert(pgSchema.groups).values(group).onConflictDoNothing()
          break
        }
      }
    } catch {
      // Group already exists — skip silently
    }
  }
}
