---
sidebar_position: 2
---

# API Reference

Complete reference for every endpoint in the OrganizrX API. All endpoints are prefixed with `/api`.

## Conventions

### Base URL

```
http://localhost:3001/api
```

### Authentication

Most endpoints require a valid JWT in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Endpoints marked **Public** do not require authentication. Endpoints marked with a group name (e.g., **Admin**) require the user to have that group or higher privilege.

### Response Format

**Success:**

```json
{ "data": { ... } }
```

**Success with metadata:**

```json
{ "data": [ ... ], "meta": { "total": 42 } }
```

**Error:**

```json
{ "error": { "code": "NOT_FOUND", "message": "Resource not found" } }
```

### Group Hierarchy

| Group ID | Role       |
| -------- | ---------- |
| 0        | Admin      |
| 1        | Co-Admin   |
| 2        | Super User |
| 3        | Power User |
| 4        | User       |
| 999      | Guest      |

Authorization checks use `groupId <= requiredGroup`. Admin (0) passes all checks.

---

## Health Check

| Method | Path          | Auth   |
| ------ | ------------- | ------ |
| GET    | `/api/health` | Public |

**Response:**

```json
{ "status": "ok", "timestamp": "2026-01-15T10:30:00.000Z" }
```

---

## Authentication

### Local Auth

| Method | Path                | Auth   | Description                                 |
| ------ | ------------------- | ------ | ------------------------------------------- |
| POST   | `/api/auth/login`   | Public | Login with credentials                      |
| POST   | `/api/auth/refresh` | Public | Refresh access token (uses httpOnly cookie) |
| POST   | `/api/auth/logout`  | Public | Logout and revoke refresh token             |
| GET    | `/api/auth/me`      | User   | Get current user profile                    |

**POST `/api/auth/login`**

```json
// Request
{ "username": "admin", "password": "password123" }

// Response (200)
{ "data": { "accessToken": "eyJ...", "user": { "id": 1, "username": "admin", "groupId": 0 } } }
// Also sets httpOnly cookie: organizrx_refresh
```

**POST `/api/auth/refresh`**

No request body. The refresh token is read from the `organizrx_refresh` httpOnly cookie.

```json
// Response (200)
{ "data": { "accessToken": "eyJ..." } }
// Also sets new httpOnly cookie: organizrx_refresh
```

**POST `/api/auth/logout`**

No request body. The refresh token cookie is cleared and the token is revoked in the database.

**GET `/api/auth/me`**

```json
// Response (200)
{ "data": { "id": 1, "username": "admin", "email": "admin@example.com", "groupId": 0 } }
```

### Plex OAuth

| Method | Path                      | Auth   | Description                        |
| ------ | ------------------------- | ------ | ---------------------------------- |
| GET    | `/api/auth/plex`          | Public | Initiate Plex OAuth flow           |
| GET    | `/api/auth/plex/callback` | Public | Poll for Plex auth result          |
| POST   | `/api/auth/plex/link`     | User   | Link Plex account to existing user |

### LDAP Auth

| Method | Path                   | Auth   | Description          |
| ------ | ---------------------- | ------ | -------------------- |
| POST   | `/api/auth/ldap/test`  | Admin  | Test LDAP connection |
| POST   | `/api/auth/ldap/login` | Public | Login via LDAP/AD    |

### OIDC Auth

| Method | Path                      | Auth   | Description          |
| ------ | ------------------------- | ------ | -------------------- |
| GET    | `/api/auth/oidc`          | Public | Initiate OIDC flow   |
| GET    | `/api/auth/oidc/callback` | Public | Handle OIDC callback |
| POST   | `/api/auth/oidc/link`     | User   | Link OIDC account    |

### Two-Factor Authentication

| Method | Path                         | Auth | Description               |
| ------ | ---------------------------- | ---- | ------------------------- |
| POST   | `/api/auth/2fa/setup`        | User | Generate TOTP secret + QR |
| POST   | `/api/auth/2fa/verify-setup` | User | Verify and enable 2FA     |
| POST   | `/api/auth/2fa/verify`       | User | Verify TOTP code at login |
| DELETE | `/api/auth/2fa`              | User | Disable 2FA               |

---

## Public Settings

| Method | Path                   | Auth   |
| ------ | ---------------------- | ------ |
| GET    | `/api/settings/public` | Public |

Returns configuration flags for the login page:

```json
{
  "data": {
    "LDAP_ENABLED": false,
    "PLEX_ENABLED": true,
    "OIDC_ENABLED": false,
    "SITE_TITLE": "OrganizrX"
  }
}
```

---

## Users

| Method | Path                      | Auth  | Description          |
| ------ | ------------------------- | ----- | -------------------- |
| GET    | `/api/users`              | Admin | List all users       |
| GET    | `/api/users/:id`          | Admin | Get user by ID       |
| POST   | `/api/users`              | Admin | Create a new user    |
| PUT    | `/api/users/:id`          | Admin | Update user          |
| DELETE | `/api/users/:id`          | Admin | Delete user          |
| PUT    | `/api/users/:id/password` | Admin | Change user password |

**POST `/api/users`**

```json
// Request
{
  "username": "newuser",
  "password": "securepassword",
  "email": "user@example.com",
  "groupId": 4
}

// Response (201)
{ "data": { "id": 2, "username": "newuser", "email": "user@example.com", "groupId": 4 } }
```

---

## Groups

| Method | Path              | Auth  | Description     |
| ------ | ----------------- | ----- | --------------- |
| GET    | `/api/groups`     | Admin | List all groups |
| GET    | `/api/groups/:id` | Admin | Get group by ID |
| POST   | `/api/groups`     | Admin | Create a group  |
| PUT    | `/api/groups/:id` | Admin | Update a group  |
| DELETE | `/api/groups/:id` | Admin | Delete a group  |

---

## Categories

| Method | Path                      | Auth  | Description         |
| ------ | ------------------------- | ----- | ------------------- |
| GET    | `/api/categories`         | User  | List all categories |
| GET    | `/api/categories/:id`     | User  | Get category by ID  |
| POST   | `/api/categories`         | Admin | Create a category   |
| PUT    | `/api/categories/:id`     | Admin | Update a category   |
| DELETE | `/api/categories/:id`     | Admin | Delete a category   |
| PUT    | `/api/categories/reorder` | Admin | Reorder categories  |

---

## Tabs

| Method | Path                             | Auth  | Description                    |
| ------ | -------------------------------- | ----- | ------------------------------ |
| GET    | `/api/tabs`                      | User  | List all tabs                  |
| GET    | `/api/tabs/category/:categoryId` | User  | List tabs in a category        |
| GET    | `/api/tabs/sidebar`              | User  | Get tabs for sidebar rendering |
| GET    | `/api/tabs/:id`                  | User  | Get tab by ID                  |
| POST   | `/api/tabs`                      | Admin | Create a tab                   |
| PUT    | `/api/tabs/reorder`              | Admin | Reorder tabs                   |
| PUT    | `/api/tabs/:id`                  | Admin | Update a tab                   |
| DELETE | `/api/tabs/:id`                  | Admin | Delete a tab                   |

**Tab type values:**

| Type | Meaning  | Description                          |
| ---- | -------- | ------------------------------------ |
| 0    | Internal | Rendered as a native OrganizrX page  |
| 1    | iFrame   | Embedded external service via iframe |

---

## Bookmarks

| Method | Path                                | Auth  | Description                 |
| ------ | ----------------------------------- | ----- | --------------------------- |
| GET    | `/api/bookmarks/categories`         | User  | List bookmark categories    |
| GET    | `/api/bookmarks/categories/:id`     | User  | Get bookmark category by ID |
| POST   | `/api/bookmarks/categories`         | Admin | Create bookmark category    |
| PUT    | `/api/bookmarks/categories/:id`     | Admin | Update bookmark category    |
| DELETE | `/api/bookmarks/categories/:id`     | Admin | Delete bookmark category    |
| PUT    | `/api/bookmarks/categories/reorder` | Admin | Reorder bookmark categories |
| GET    | `/api/bookmarks/tabs`               | User  | List bookmark tabs          |
| GET    | `/api/bookmarks/tabs/:id`           | User  | Get bookmark tab by ID      |
| POST   | `/api/bookmarks/tabs`               | Admin | Create bookmark tab         |
| PUT    | `/api/bookmarks/tabs/:id`           | Admin | Update bookmark tab         |
| DELETE | `/api/bookmarks/tabs/:id`           | Admin | Delete bookmark tab         |
| PUT    | `/api/bookmarks/tabs/reorder`       | Admin | Reorder bookmark tabs       |

---

## Settings

| Method | Path                 | Auth  | Description             |
| ------ | -------------------- | ----- | ----------------------- |
| GET    | `/api/settings`      | Admin | Get all settings        |
| GET    | `/api/settings/:key` | Admin | Get a single setting    |
| PUT    | `/api/settings/:key` | Admin | Update a single setting |
| PUT    | `/api/settings`      | Admin | Bulk update settings    |

Settings are stored as key-value pairs in the `options` table.

---

## Invites

| Method | Path                        | Auth   | Description                |
| ------ | --------------------------- | ------ | -------------------------- |
| GET    | `/api/invites`              | Admin  | List all invite codes      |
| POST   | `/api/invites`              | Admin  | Create a new invite code   |
| GET    | `/api/invites/:code/verify` | Public | Verify an invite code      |
| POST   | `/api/invites/redeem`       | Public | Redeem invite and register |
| DELETE | `/api/invites/:id`          | Admin  | Delete an invite code      |

**POST `/api/invites`**

```json
// Request
{ "uses": 5, "expiresAt": "2026-12-31T23:59:59Z" }

// Response (201)
{ "data": { "id": 1, "code": "abc123def456", "uses": 5, "usedCount": 0, "expiresAt": "2026-12-31T23:59:59Z" } }
```

---

## SSO

| Method | Path                | Auth  | Description               |
| ------ | ------------------- | ----- | ------------------------- |
| GET    | `/api/sso/services` | Admin | List SSO-enabled services |
| GET    | `/api/sso/config`   | Admin | Get SSO configuration     |
| PUT    | `/api/sso/config`   | Admin | Update SSO configuration  |
| GET    | `/api/sso/cookies`  | User  | Get SSO cookies for tabs  |

---

## Plugins

| Method | Path                        | Auth  | Description                 |
| ------ | --------------------------- | ----- | --------------------------- |
| GET    | `/api/plugins`              | Admin | List installed plugins      |
| GET    | `/api/plugins/available`    | Admin | List available plugins      |
| POST   | `/api/plugins/install`      | Admin | Install a plugin            |
| DELETE | `/api/plugins/:name`        | Admin | Uninstall a plugin          |
| POST   | `/api/plugins/:name/update` | Admin | Update a plugin             |
| GET    | `/api/plugins/:name/config` | Admin | Get plugin configuration    |
| PUT    | `/api/plugins/:name/config` | Admin | Update plugin configuration |

Plugin-specific routes are mounted dynamically under `/api/plugins/:name/` based on each plugin's `getRoutes()` implementation.

---

## Setup Wizard

| Method | Path                   | Auth   | Description              |
| ------ | ---------------------- | ------ | ------------------------ |
| GET    | `/api/wizard/status`   | Public | Check if setup is needed |
| POST   | `/api/wizard/complete` | Public | Complete initial setup   |

The wizard endpoints are only functional when no admin user exists. After setup, they return errors.

**POST `/api/wizard/complete`**

```json
// Request
{
  "username": "admin",
  "password": "securepassword",
  "email": "admin@example.com"
}

// Response (200)
{ "data": { "message": "Setup complete", "accessToken": "eyJ..." } }
```

---

## Migration

| Method | Path                      | Auth  | Description                      |
| ------ | ------------------------- | ----- | -------------------------------- |
| GET    | `/api/migration/status`   | Admin | Check legacy DB migration status |
| GET    | `/api/migration/progress` | Admin | Get current migration progress   |
| POST   | `/api/migration/start`    | Admin | Start migration (SSE stream)     |

For detailed endpoint documentation, request/response schemas, and SSE event format, see the [Migration API Reference](./migration-api.md).

---

## Backup

| Method | Path                       | Auth  | Description            |
| ------ | -------------------------- | ----- | ---------------------- |
| POST   | `/api/backup`              | Admin | Create a backup        |
| GET    | `/api/backup`              | Admin | List all backups       |
| GET    | `/api/backup/:id/download` | Admin | Download a backup file |
| POST   | `/api/backup/restore`      | Admin | Restore from a backup  |
| DELETE | `/api/backup/:id`          | Admin | Delete a backup        |

---

## Connection Tester

| Method | Path                   | Auth  | Description              |
| ------ | ---------------------- | ----- | ------------------------ |
| POST   | `/api/test-connection` | Admin | Test connectivity to URL |

Tests whether the server can reach a given URL. Includes SSRF protection (blocks cloud metadata endpoints, non-HTTP schemes). Private IPs are allowed for home-lab use.

```json
// Request
{ "url": "http://192.168.1.100:8989", "method": "GET" }

// Response (200)
{ "data": { "success": true, "statusCode": 200, "responseTime": 42 } }
```

---

## Images

| Method | Path                      | Auth   | Description              |
| ------ | ------------------------- | ------ | ------------------------ |
| POST   | `/api/images/upload`      | Admin  | Upload an image          |
| GET    | `/api/images/proxy`       | User   | Proxy an external image  |
| GET    | `/api/images/favicon.ico` | Public | Get the site favicon     |
| GET    | `/api/images`             | Admin  | List uploaded images     |
| GET    | `/api/images/:filename`   | User   | Get an uploaded image    |
| DELETE | `/api/images/:filename`   | Admin  | Delete an uploaded image |

---

## Update Checker

| Method | Path                    | Auth  | Description           |
| ------ | ----------------------- | ----- | --------------------- |
| GET    | `/api/update`           | Admin | Check for updates     |
| GET    | `/api/update/changelog` | Admin | Get release changelog |

---

## Logs

| Method | Path                           | Auth  | Description            |
| ------ | ------------------------------ | ----- | ---------------------- |
| GET    | `/api/logs`                    | Admin | Get recent log entries |
| GET    | `/api/logs/files`              | Admin | List log files         |
| GET    | `/api/logs/download/:filename` | Admin | Download a log file    |
| DELETE | `/api/logs`                    | Admin | Clear logs             |
