
export interface ColumnMapping {
  /** Old column name in the legacy DB */
  oldColumn: string
  /** New column name in OrganizrX schema */
  newColumn: string
  /** Optional transform applied during migration */
  transform?: (value: unknown) => unknown
}

export interface TableMapping {
  /** Old table name in the legacy DB */
  oldTable: string
  /** New table name in OrganizrX schema */
  newTable: string
  /** Column-level mappings */
  columns: ColumnMapping[]
  /** Extra columns to add with default values during insert */
  defaults?: Record<string, unknown>
  /** Whether to skip this table entirely */
  skip?: boolean
}

// PHP bcrypt uses $2y$ prefix, Node.js uses $2a$ — functionally identical
function swapBcryptPrefix(value: unknown): unknown {
  if (typeof value !== 'string') return value
  if (value.startsWith('$2y$')) {
    return '$2a$' + value.slice(4)
  }
  return value
}

/** Identity columns — maps each column to itself with no transform. */
function identity(...columns: string[]): ColumnMapping[] {
  return columns.map((col) => ({ oldColumn: col, newColumn: col }))
}

export const tableMappings: TableMapping[] = [
  {
    oldTable: 'groups',
    newTable: 'groups',
    columns: [...identity('id', 'group', 'group_id', 'image', 'default')],
  },
  {
    oldTable: 'users',
    newTable: 'users',
    columns: [
      ...identity(
        'id',
        'username',
        'email',
        'plex_token',
        'group',
        'group_id',
        'locked',
        'image',
        'register_date',
        'auth_service'
      ),
      { oldColumn: 'password', newColumn: 'password', transform: swapBcryptPrefix },
    ],
    defaults: {
      totp_secret: null,
      totp_enabled: 0,
      totp_backup_codes: null,
    },
  },
  {
    oldTable: 'tokens',
    newTable: 'tokens',
    columns: [],
    skip: true, // Invalidate all old tokens — users must re-login
  },
  {
    oldTable: 'categories',
    newTable: 'categories',
    columns: [...identity('id', 'order', 'category', 'category_id', 'image', 'default')],
  },
  {
    oldTable: 'tabs',
    newTable: 'tabs',
    columns: [
      ...identity(
        'id',
        'order',
        'category_id',
        'name',
        'url',
        'url_local',
        'default',
        'enabled',
        'group_id',
        'group_id_max',
        'add_to_admin',
        'image',
        'type',
        'splash',
        'ping',
        'ping_url',
        'timeout',
        'timeout_ms',
        'preload'
      ),
    ],
  },
  {
    oldTable: 'options',
    newTable: 'options',
    columns: [...identity('id', 'name', 'value')],
  },
  {
    oldTable: 'chatroom',
    newTable: 'chatroom',
    columns: [...identity('id', 'username', 'gravatar', 'uid', 'date', 'ip', 'message')],
  },
  {
    oldTable: 'invites',
    newTable: 'invites',
    columns: [
      ...identity(
        'id',
        'code',
        'date',
        'email',
        'username',
        'dateused',
        'usedby',
        'ip',
        'valid',
        'type',
        'invitedby'
      ),
    ],
  },
  {
    oldTable: 'BOOKMARK-categories',
    newTable: 'BOOKMARK-categories',
    columns: [...identity('id', 'order', 'category', 'category_id', 'default')],
  },
  {
    oldTable: 'BOOKMARK-tabs',
    newTable: 'BOOKMARK-tabs',
    columns: [
      ...identity(
        'id',
        'order',
        'category_id',
        'name',
        'url',
        'enabled',
        'group_id',
        'image',
        'background_color',
        'text_color'
      ),
    ],
  },
]

export const migratedTables = tableMappings.filter((t) => !t.skip)

export const skippedTables = tableMappings.filter((t) => t.skip).map((t) => t.oldTable)
