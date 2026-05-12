---
sidebar_position: 5
---

# Migration API Reference

## Overview

OrganizrX provides three API endpoints for programmatic migration control. These are supplementary to the automatic startup migration — most users will never need them. They are useful for:

- Monitoring migration progress in custom dashboards
- Triggering migration manually after startup
- Debugging migration issues

All endpoints require admin authentication (group 0) via Bearer token in the `Authorization` header.

## Authentication

All migration endpoints are protected by `authMiddleware()` and `requireGroup(0)`. Requests must include:

```
Authorization: Bearer <your-jwt-token>
```

Unauthenticated requests receive a `401 Unauthorized` response.

## Endpoints

### GET /api/migration/status

Returns the current migration status of the connected database.

**Response (200 OK):**
```json
{
  "data": {
    "needsMigration": true,
    "alreadyMigrated": false,
    "configVersion": "2.1.0",
    "missingColumns": ["totp_secret", "totp_enabled", "totp_backup_codes"]
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `needsMigration` | boolean | Whether the database needs schema updates |
| `alreadyMigrated` | boolean | Whether migration has already been completed |
| `configVersion` | string | null | Legacy `CONFIG_VERSION` from the options table |
| `missingColumns` | string[] | List of TOTP columns not yet present in the users table |

### GET /api/migration/progress

Returns the current migration progress (if a migration is running).

**Response (200 OK):**
```json
{
  "data": {
    "inProgress": true,
    "progress": {
      "step": "Adding column: totp_secret",
      "current": 1,
      "total": 5
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `inProgress` | boolean | Whether a migration is currently running |
| `progress` | object | null | Current step details (null if not running) |

### POST /api/migration/start

Triggers migration and returns a **Server-Sent Events (SSE) stream** — NOT a standard JSON response.

**Response Headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**SSE Event Types:**

**Progress event** (emitted during migration):
```
data: {"type":"progress","step":"Adding column: totp_secret","current":1,"total":5}
```

**Complete event** (emitted on success):
```
data: {"type":"complete","columnsAdded":["totp_secret","totp_enabled","totp_backup_codes"],"tablesCleared":["tokens"],"transformsApplied":["Swap PHP bcrypt $2y$ prefix to Node.js $2a$"],"backupPath":null,"durationMs":142}
```

**Error event** (emitted on failure):
```
data: {"type":"error","error":"Column addition failed: totp_secret","columnsAdded":[],"backupPath":null}
```

**Concurrent Request (409 Conflict):**
```json
{
  "error": {
    "code": "MIGRATION_IN_PROGRESS",
    "message": "A migration is already running"
  }
}
```

:::caution SSE Client Requirements
Standard HTTP clients (like `curl` or `fetch` with default settings) will work, but you must handle the streaming response. Do not expect a single JSON response body.

Example with curl:
```bash
curl -N -H "Authorization: Bearer <token>" \
  -X POST http://localhost:3001/api/migration/start
```
:::

### Reverse Proxy Configuration

If your OrganizrX instance is behind a reverse proxy, you must configure it to support SSE:

**Nginx:**
```nginx
location /api/migration/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_read_timeout 300s;
    proxy_buffering off;
    proxy_cache off;
}
```

## Detection Logic

OrganizrX determines whether migration is needed by checking:

1. **CONFIG_VERSION**: Queries the `options` table for a row with `name = 'CONFIG_VERSION'`. Its presence indicates a legacy Organizr v2 database.
2. **Missing TOTP columns**: Checks whether the `users` table has `totp_secret`, `totp_enabled`, and `totp_backup_codes` columns.

Migration is triggered if **either** condition is true (`configVersion !== null || missingColumns.length > 0`).

A fresh/empty database (no rows in `users` table or no `options` table) returns `needsMigration: false`.

A previously migrated database (has `_migration_completed` in `options`) returns `alreadyMigrated: true`.

## Pipeline Details

The migration pipeline performs exactly these operations in order:

1. **Schema changes**: For each missing TOTP column, runs `ALTER TABLE users ADD COLUMN ...` (with `columnExists()` check before each)
2. **Data transforms**: Swaps bcrypt prefix `$2y$` → `$2a$` via `UPDATE users SET password = REPLACE(...)`
3. **Table clearing**: Runs `DELETE FROM tokens` to invalidate all legacy PHP sessions
4. **Completion marker**: Inserts `_migration_completed` with ISO timestamp into the `options` table

### Idempotency

The pipeline is fully idempotent:
- `columnExists()` gates each ALTER TABLE — already-present columns are skipped
- The bcrypt REPLACE is a no-op on already-swapped values
- DELETE on an empty table is safe
- The completion marker prevents re-running (returns early with `alreadyMigrated: true`)

If the server crashes mid-migration, restarting it will safely resume from where it left off.

### Dialect Support

All operations work on SQLite, MySQL, and PostgreSQL. The `sql-helpers.ts` module provides dialect-aware SQL execution with appropriate quoting and introspection queries for each database.

## Known Issues

| Issue | Details |
|-------|---------|
| **Auto-backup is dead code** | The `createBackup()` function exists but is never called — `dbFilePath` is never passed to `runMigration()` in any production code path. Users must manually back up before migration. |
| **Wizard auth bug** | `Migration.tsx` uses native `fetch()` instead of the axios client with Bearer token interceptor. API calls from the wizard get 401 responses. The automatic startup migration is unaffected. |
| **`LEGACY_DB_PATH` unused** | Defined in `env.ts` but never read by startup code or route handlers. |
| **`LEGACY_DB_URL` unused** | Defined in `env.ts` but never referenced anywhere in the migration code. |
| **In-memory concurrency guard** | The `migrationInProgress` flag is module-level and lost on server restart. This is a minor operational note — the idempotent pipeline makes re-running safe. |
