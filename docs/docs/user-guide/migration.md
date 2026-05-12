---
sidebar_position: 7
---

# Migrating from Organizr v2

## What Happens to My Data?
OrganizrX connects to your EXISTING database and upgrades the schema in-place. Most data stays exactly where it is. Unlike a traditional migration that moves files or exports records, OrganizrX simply adapts your existing database to the new TypeScript-based platform.

### What Gets Modified
- 3 TOTP columns added to users table (totp_secret, totp_enabled, totp_backup_codes) for two-factor authentication support
- Bcrypt hash prefix swapped from $2y$ to $2a$ (PHP→Node.js compatibility — your passwords still work identically)
- All active sessions invalidated (tokens table cleared — everyone will need to log in again)
- Migration completion marker written to options table

### What Stays Untouched
- tabs
- categories
- groups
- settings
- chatroom history
- invites
- bookmarks

All of these are preserved as-is in the shared database. Nothing is copied, moved, or restructured.

## Before You Begin

:::danger Manual Backup Required
OrganizrX does **not** automatically back up your database during migration. You **must** create a manual backup before proceeding. If anything goes wrong, this backup is your only recovery path.
:::

### Backup Commands by Database Type

**SQLite:**
```bash
cp /path/to/organizr.db /path/to/organizr.db.bak
```

**MySQL:**
```bash
mysqldump -u root -p organizr > organizr_backup.sql
```

**PostgreSQL:**
```bash
pg_dump -U postgres organizr > organizr_backup.sql
```

### Important: All Sessions Will Be Invalidated

During migration, all existing login sessions are cleared. Every user on every device, including family members' TVs, phones, and tablets, will be logged out and need to re-authenticate. If you run a homelab dashboard for your household, consider notifying family members before proceeding.

### Supported Databases

The migration pipeline works identically on SQLite, MySQL, and PostgreSQL. The schema changes (ALTER TABLE) and data transforms are dialect-aware.

## How Migration Works

### Decision Flowchart

```mermaid
flowchart TD
    A[Start OrganizrX] --> B{Existing Organizr v2 database?}
    B -->|No| C[Fresh install — no migration needed]
    B -->|Yes| D[Point DATABASE_URL at existing DB]
    D --> E[Start OrganizrX server]
    E --> F[Auto-detects old schema at startup]
    F --> G[Migration runs before HTTP server starts]
    G --> H[Schema updated in-place]
    H --> I[All users logged out — re-login required]
```

### What Gets Detected

OrganizrX checks for two signals at startup:
1. A `CONFIG_VERSION` entry in the `options` table (present in Organizr v2 databases)
2. Missing TOTP columns (`totp_secret`, `totp_enabled`, `totp_backup_codes`) in the `users` table

If either condition is true, migration is triggered. If neither is true (fresh database or already migrated), no migration runs.

## Step-by-Step: Automatic Migration (Recommended)

Migration runs automatically at server startup. No wizard, no API calls needed for the primary path.

1. **Back up your database** (see backup commands above)
2. **Stop your old Organizr v2 instance** to prevent database conflicts
3. **Configure environment variables:**

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_DIALECT` | Yes | `sqlite`, `mysql`, or `postgresql` |
| `DATABASE_URL` | Yes | Connection string pointing at your existing Organizr database |

4. **Start OrganizrX**

**SQLite:**
```yaml
services:
  organizrx:
    image: dawidkulpa/organizrx:latest
    ports:
      - "3001:3001"
    volumes:
      - /path/to/organizr/config:/app/data
    environment:
      - DATABASE_DIALECT=sqlite
      - DATABASE_URL=file:./data/organizr.db
```

**MySQL:**
```yaml
services:
  organizrx:
    image: dawidkulpa/organizrx:latest
    ports:
      - "3001:3001"
    environment:
      - DATABASE_DIALECT=mysql
      - DATABASE_URL=mysql://user:password@host:3306/organizr
```

**PostgreSQL:**
```yaml
services:
  organizrx:
    image: dawidkulpa/organizrx:latest
    ports:
      - "3001:3001"
    environment:
      - DATABASE_DIALECT=postgresql
      - DATABASE_URL=postgresql://user:password@host:5432/organizr
```

5. **Verify migration completed** — check server logs for "Migration completed successfully" or log in to the web UI

## Alternative: Migration API (Advanced)

For programmatic control or debugging, OrganizrX exposes three migration API endpoints. All require admin authentication (group 0).

| Endpoint | Method | Response |
|----------|--------|----------|
| `/api/migration/status` | GET | JSON — migration status and missing columns |
| `/api/migration/progress` | GET | JSON — current migration progress |
| `/api/migration/start` | POST | SSE stream — real-time progress events |

The `/start` endpoint returns a Server-Sent Events stream, not a standard JSON response. See the [Migration API Reference](../developer-guide/migration-api.md) for full details.

## Migration Wizard (Experimental)

A web-based migration wizard exists at the `/migration` route. It provides a visual interface for monitoring migration progress. However, the wizard currently has a known authentication issue, it uses browser `fetch()` without attaching the required Bearer token. The automatic startup migration (described above) is the recommended approach.

## What If Something Goes Wrong?

### Migration Crashed or Server Stopped Mid-Way

The migration pipeline is fully idempotent. Each column addition checks whether the column already exists before attempting to add it. The bcrypt prefix swap only targets passwords that still have the old `$2y$` prefix. The token table clear is a simple DELETE that's safe to re-run. If your server crashes or stops during migration, simply restart it, the migration will safely resume from where it left off.

### Rolling Back

1. Stop OrganizrX
2. Restore your manual backup:
   - **SQLite:** `cp /path/to/organizr.db.bak /path/to/organizr.db`
   - **MySQL:** `mysql -u root -p organizr < organizr_backup.sql`
   - **PostgreSQL:** `psql -U postgres organizr < organizr_backup.sql`
3. Start your original Organizr v2 instance

### Reverse Proxy Configuration

If you use Nginx or another reverse proxy and plan to use the migration API or wizard, ensure your proxy supports Server-Sent Events:

```nginx
location /api/migration/ {
    proxy_pass http://localhost:3001;
    proxy_read_timeout 300s;
    proxy_buffering off;
    proxy_cache off;
}
```

## Post-Migration Checklist

- [ ] Admin can log in successfully
- [ ] All user accounts are present with correct group memberships
- [ ] Tabs and categories display correctly
- [ ] TOTP/2FA can be enabled on user profiles
- [ ] Family members have re-authenticated on their devices
- [ ] Old Organizr v2 instance is stopped (to prevent database conflicts)

## Frequently Asked Questions

**Will my passwords still work?**
Yes. The bcrypt prefix swap (`$2y$` → `$2a$`) is purely cosmetic, the hash algorithm and your actual passwords are unchanged.

**Will my tabs and services still appear?**
Yes. Tabs, categories, and all service configurations are stored in the same database and are not modified during migration.

**Can I run both Organizr v2 and OrganizrX at the same time?**
Not recommended. Both would connect to the same database, which could cause conflicts. Stop Organizr v2 before starting OrganizrX.

**What about my plugins?**
The OrganizrX plugin system is completely rebuilt in TypeScript. Legacy PHP plugins are not compatible. Check the [plugins documentation](./plugins.md) for available OrganizrX plugins.

**What if migration isn't detected?**
OrganizrX looks for `CONFIG_VERSION` in the `options` table or missing TOTP columns in the `users` table. If neither condition is met, no migration runs. Verify your `DATABASE_URL` points to the correct database.
