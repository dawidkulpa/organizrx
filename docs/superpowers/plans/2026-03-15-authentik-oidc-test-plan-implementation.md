# Auth Mechanism Testing — All Providers (Authentik-First) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement comprehensive testing of all 7 auth mechanisms in OrganizrX — docker-compose test stack, manual testing, then automated route-level tests — with authentik OIDC as highest priority.

**Architecture:** Three phases: (1) Create `docker-compose.test-auth.yml` with authentik + OrganizrX for manual testing, (2) Manual testing checklist for all 7 auth mechanisms, (3) Automated route-level tests using `bun:test` with mocked external dependencies following existing `auth-plex.spec.ts` patterns.

**Tech Stack:** TypeScript, Bun, Hono, `bun:test`, `mock()` from `bun:test`, SQLite (temp DBs), Docker Compose, authentik

**Spec document:** `docs/superpowers/specs/2026-03-15-authentik-oidc-test-plan-design.md`

---

## File Structure

### New Files to Create

| File                                            | Purpose                                                |
| ----------------------------------------------- | ------------------------------------------------------ |
| `docker-compose.test-auth.yml`                  | 5-container auth testing stack (authentik + OrganizrX) |
| `.env.test-auth`                                | Environment variables for the test auth stack          |
| `tests/auth/authentik-blueprint.yaml`           | Authentik blueprint: OIDC provider, app, users, groups |
| `apps/server/src/routes/auth-oidc.spec.ts`      | OIDC route tests (highest priority)                    |
| `apps/server/src/routes/auth.spec.ts`           | Local auth route tests (login, refresh, logout, me)    |
| `apps/server/src/routes/auth-2fa.spec.ts`       | 2FA route tests (setup, verify-setup, verify, disable) |
| `apps/server/src/routes/auth-ldap.spec.ts`      | LDAP route tests (test, login)                         |
| `apps/server/src/middleware/auth-proxy.spec.ts` | Auth proxy middleware tests                            |
| `apps/server/src/routes/sso.spec.ts`            | SSO route tests (services, config, cookies)            |

### Existing Files (DO NOT MODIFY)

| File                                       | Reason                                                    |
| ------------------------------------------ | --------------------------------------------------------- |
| `docker-compose.yml`                       | Main production compose — user explicitly said keep clean |
| `docker-compose.test.yml`                  | DB testing compose — out of scope                         |
| `Dockerfile`                               | Shared by all compose files — no changes needed           |
| `apps/server/src/routes/auth-plex.spec.ts` | Reference pattern only — already complete                 |

---

## Chunk 1: Docker Compose + Authentik Blueprint

### Task 1: Create `docker-compose.test-auth.yml`

**Files:**

- Create: `docker-compose.test-auth.yml`

- [ ] **Step 1: Create the docker-compose file**

```yaml
# docker-compose.test-auth.yml
# Standalone auth testing stack — DO NOT merge with docker-compose.yml
# Usage:
#   docker compose -f docker-compose.test-auth.yml up -d
#   docker compose -f docker-compose.test-auth.yml down -v

services:
  # --- Authentik dependencies ---

  authentik-db:
    image: postgres:16-alpine
    container_name: test-auth-db
    environment:
      POSTGRES_DB: authentik
      POSTGRES_USER: authentik
      POSTGRES_PASSWORD: authentik-test-password
    volumes:
      - authentik-db-data:/var/lib/postgresql/data
    networks:
      - test-auth-net
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U authentik']
      interval: 5s
      timeout: 3s
      retries: 10

  authentik-redis:
    image: redis:7-alpine
    container_name: test-auth-redis
    networks:
      - test-auth-net
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 3s
      retries: 10

  # --- Authentik server + worker ---

  authentik-server:
    image: ghcr.io/goauthentik/server:latest
    container_name: test-auth-authentik
    command: server
    environment:
      AUTHENTIK_SECRET_KEY: test-secret-key-not-for-production
      AUTHENTIK_REDIS__HOST: authentik-redis
      AUTHENTIK_POSTGRESQL__HOST: authentik-db
      AUTHENTIK_POSTGRESQL__USER: authentik
      AUTHENTIK_POSTGRESQL__NAME: authentik
      AUTHENTIK_POSTGRESQL__PASSWORD: authentik-test-password
      AUTHENTIK_BOOTSTRAP_PASSWORD: akadmin-test-password
      AUTHENTIK_BOOTSTRAP_EMAIL: admin@test.local
    ports:
      - '9000:9000'
    volumes:
      - ./tests/auth/authentik-blueprint.yaml:/blueprints/custom/organizrx-test.yaml:ro
    networks:
      - test-auth-net
    depends_on:
      authentik-db:
        condition: service_healthy
      authentik-redis:
        condition: service_healthy
    healthcheck:
      test: ['CMD', 'ak', 'healthcheck']
      interval: 10s
      timeout: 5s
      retries: 15
      start_period: 30s

  authentik-worker:
    image: ghcr.io/goauthentik/server:latest
    container_name: test-auth-worker
    command: worker
    environment:
      AUTHENTIK_SECRET_KEY: test-secret-key-not-for-production
      AUTHENTIK_REDIS__HOST: authentik-redis
      AUTHENTIK_POSTGRESQL__HOST: authentik-db
      AUTHENTIK_POSTGRESQL__USER: authentik
      AUTHENTIK_POSTGRESQL__NAME: authentik
      AUTHENTIK_POSTGRESQL__PASSWORD: authentik-test-password
    volumes:
      - ./tests/auth/authentik-blueprint.yaml:/blueprints/custom/organizrx-test.yaml:ro
    networks:
      - test-auth-net
    depends_on:
      authentik-db:
        condition: service_healthy
      authentik-redis:
        condition: service_healthy

  # --- OrganizrX ---

  organizrx:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: test-auth-organizrx
    ports:
      - '3001:3001'
    environment:
      PORT: 3001
      HOST: 0.0.0.0
      NODE_ENV: production
      DATABASE_DIALECT: sqlite
      DATABASE_URL: /app/data/organizr.db
      JWT_SECRET: test-jwt-secret-min-32-chars-long
      BCRYPT_ROUNDS: 4
      LOG_LEVEL: debug
    volumes:
      - organizrx-data:/app/data
    networks:
      - test-auth-net
    depends_on:
      authentik-server:
        condition: service_healthy
    healthcheck:
      test:
        [
          'CMD',
          'bun',
          '--eval',
          "fetch('http://localhost:3001/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))",
        ]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s

volumes:
  authentik-db-data:
  organizrx-data:

networks:
  test-auth-net:
    driver: bridge
```

- [ ] **Step 2: Verify the compose file is valid YAML**

Run: `docker compose -f docker-compose.test-auth.yml config --quiet`
Expected: Exit code 0, no output (valid YAML)

- [ ] **Step 3: Commit**

```bash
git add docker-compose.test-auth.yml
git commit -m "test: add docker-compose for auth testing with authentik"
```

---

### Task 2: Create authentik blueprint + env file

**Files:**

- Create: `tests/auth/authentik-blueprint.yaml`
- Create: `.env.test-auth`

- [ ] **Step 1: Create the tests/auth directory**

Run: `mkdir -p tests/auth`

- [ ] **Step 2: Create the authentik blueprint**

The blueprint auto-configures authentik on first boot: creates an OAuth2/OIDC provider, application, test users, and groups.

Refer to authentik blueprint docs: https://docs.goauthentik.io/docs/customize/blueprints

```yaml
# tests/auth/authentik-blueprint.yaml
# Authentik blueprint for OrganizrX auth testing
# Auto-applied on first boot via /blueprints/custom/ mount
version: 1
metadata:
  name: OrganizrX Test Setup
  labels:
    blueprints.goauthentik.io/description: 'OIDC provider, test users, and groups for OrganizrX auth testing'

entries:
  # --- Groups ---
  - model: authentik_core.group
    id: organizrx-admins-group
    identifiers:
      name: organizrx-admins
    attrs:
      name: organizrx-admins

  - model: authentik_core.group
    id: organizrx-users-group
    identifiers:
      name: organizrx-users
    attrs:
      name: organizrx-users

  # --- Test Users ---
  - model: authentik_core.user
    id: test-admin-user
    identifiers:
      username: testadmin
    attrs:
      username: testadmin
      name: Test Admin
      email: testadmin@test.local
      path: users
      is_active: true
    state: present

  - model: authentik_core.user
    id: test-regular-user
    identifiers:
      username: testuser
    attrs:
      username: testuser
      name: Test User
      email: testuser@test.local
      path: users
      is_active: true
    state: present

  # --- Assign users to groups ---
  # Note: User passwords are set via AUTHENTIK_BOOTSTRAP or the API after boot.
  # Blueprint user creation doesn't support setting passwords directly.
  # We'll set passwords in the manual testing checklist via the admin UI or API.

  # --- Certificate/Key pair for OIDC signing ---
  - model: authentik_crypto.certificatekeypair
    id: organizrx-test-keypair
    identifiers:
      name: organizrx-test-signing-key
    attrs:
      name: organizrx-test-signing-key
      certificate_data: ''
      key_data: ''
    conditions: []
    state: must_created

  # --- OAuth2/OIDC Provider ---
  - model: authentik_providers_oauth2.oauth2provider
    id: organizrx-oidc-provider
    identifiers:
      name: organizrx-test-provider
    attrs:
      name: organizrx-test-provider
      authorization_flow:
        !Find [authentik_flows.flow, [slug, default-provider-authorization-explicit-consent]]
      client_type: confidential
      client_id: organizrx-test
      client_secret: organizrx-test-secret
      redirect_uris: |
        http://localhost:3001/api/auth/oidc/callback
      sub_mode: hashed_user_id
      include_claims_in_id_token: true
      issuer_mode: per_provider
      access_code_validity: minutes=1
      access_token_validity: minutes=5
      refresh_token_validity: days=30

  # --- Application ---
  - model: authentik_core.application
    id: organizrx-test-app
    identifiers:
      slug: organizrx-test
    attrs:
      name: organizrx-test
      slug: organizrx-test
      provider: !KeyOf organizrx-oidc-provider
      meta_launch_url: http://localhost:3001
      policy_engine_mode: any

  # --- Property Mapping for groups claim ---
  # This adds a 'groups' claim to the ID token containing the user's group names
  - model: authentik_providers_oauth2.scopemapping
    id: organizrx-groups-scope
    identifiers:
      managed: goauthentik.io/providers/oauth2/scope-organizrx-groups
    attrs:
      name: 'OrganizrX Groups'
      scope_name: groups
      description: 'Include user groups in ID token'
      expression: |
        return [group.name for group in request.user.ak_groups.all()]
```

**Important notes about this blueprint:**

- User passwords cannot be set via blueprint. After first boot, set them via the authentik admin UI at `http://localhost:9000` (login as `akadmin` / `akadmin-test-password`), or via the authentik API.
- The groups scope mapping must be assigned to the provider. This may need to be done manually after boot if the blueprint doesn't support the M2M relationship natively.
- The certificate keypair with empty data uses `must_created` state which tells authentik to generate a self-signed cert if one doesn't exist.

- [ ] **Step 3: Create the `.env.test-auth` file**

```env
# .env.test-auth
# Environment variables for docker-compose.test-auth.yml
# Usage: docker compose -f docker-compose.test-auth.yml --env-file .env.test-auth up -d

# Authentik
AUTHENTIK_SECRET_KEY=test-secret-key-not-for-production
AUTHENTIK_BOOTSTRAP_PASSWORD=akadmin-test-password
AUTHENTIK_BOOTSTRAP_EMAIL=admin@test.local
PG_PASS=authentik-test-password

# OrganizrX
JWT_SECRET=test-jwt-secret-min-32-chars-long
```

- [ ] **Step 4: Add `.env.test-auth` to `.gitignore` check**

Run: `grep -q '.env.test-auth' .gitignore && echo "Already ignored" || echo ".env.test-auth" >> .gitignore`

Note: Even though these are test-only credentials, the `.env` file should still be gitignored as a best practice. The values are documented in the docker-compose file itself and in this plan.

- [ ] **Step 5: Verify blueprint YAML is valid**

Run: `bun --eval "import YAML from 'yaml'; import { readFileSync } from 'fs'; YAML.parse(readFileSync('tests/auth/authentik-blueprint.yaml', 'utf8')); console.log('Valid YAML')"`

If `yaml` package isn't available, use: `python3 -c "import yaml; yaml.safe_load(open('tests/auth/authentik-blueprint.yaml')); print('Valid YAML')"`

Expected: "Valid YAML"

- [ ] **Step 6: Commit**

```bash
git add tests/auth/authentik-blueprint.yaml .gitignore
git commit -m "test: add authentik blueprint and env for auth testing stack"
```

---

## Chunk 2: Manual Testing Checklist

### Task 3: Manual Testing of All Auth Mechanisms

This task is a human-driven checklist — no code to write. Start the docker stack, then walk through each mechanism. Fix any bugs found before proceeding to automated tests (Phase 3).

**Files:**

- No files created or modified — this is a manual verification pass

- [ ] **Step 1: Start the auth testing stack**

```bash
docker compose -f docker-compose.test-auth.yml up -d --build
```

Wait for all containers to be healthy:

```bash
# Poll until all 5 containers show "healthy"
docker compose -f docker-compose.test-auth.yml ps
```

Expected: All 5 services (`authentik-db`, `authentik-redis`, `authentik-server`, `authentik-worker`, `organizrx`) show `healthy`. Authentik may take 60-90s on first boot.

- [ ] **Step 2: Configure authentik test users**

Authentik blueprint creates users but cannot set passwords. Set them via the admin UI:

1. Open `http://localhost:9000` → login as `akadmin` / `akadmin-test-password`
2. Navigate to **Directory → Users**
3. Select `testadmin` → **Set Password** → `testpassword`
4. Select `testuser` → **Set Password** → `testpassword`
5. Navigate to **Directory → Groups**
6. Select `organizrx-admins` → **Members** tab → Add `testadmin`
7. Select `organizrx-users` → **Members** tab → Add `testuser`
8. Navigate to **Applications → Providers → organizrx-test-provider**
9. Under **Advanced Protocol Settings**, verify the `groups` scope mapping (`OrganizrX Groups`) is included. If not, add it.

- [ ] **Step 3: Run the OrganizrX setup wizard**

1. Open `http://localhost:3001`
2. Complete the setup wizard (creates DB, admin user)
3. After setup, navigate to **Settings → Authentication → OIDC**
4. Configure OIDC with these values:

| Setting          | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| OIDC Enabled     | `true`                                                       |
| Provider URL     | `http://authentik-server:9000/application/o/organizrx-test/` |
| Client ID        | `organizrx-test`                                             |
| Client Secret    | `organizrx-test-secret`                                      |
| Scopes           | `openid profile email groups`                                |
| Redirect URI     | `http://localhost:3001/api/auth/oidc/callback`               |
| Group Claim      | `groups`                                                     |
| Group Mapping    | `{"organizrx-admins": 0, "organizrx-users": 4}`              |
| Auto Create User | `true`                                                       |
| Default Group ID | `4`                                                          |

**Important**: The `Provider URL` uses the Docker network hostname `authentik-server`, NOT `localhost`. This is because the OrganizrX container communicates with authentik over the Docker network. However, browser redirects go to `localhost:9000`. If the OIDC initiation flow fails because the server can't reach `authentik-server:9000`, you may need to use `http://localhost:9000/application/o/organizrx-test/` instead AND add a network alias or host entry.

- [ ] **Step 4: Verify OIDC discovery endpoint**

```bash
curl -s http://localhost:9000/application/o/organizrx-test/.well-known/openid-configuration | python3 -m json.tool
```

Expected: Valid JSON with `issuer`, `authorization_endpoint`, `token_endpoint`, `jwks_uri` fields.

- [ ] **Step 5: Test OIDC happy path (HIGHEST PRIORITY)**

1. **Initiate**: `GET http://localhost:3001/api/auth/oidc`
   - Verify: `200` with `{ data: { redirectUrl, state } }`
   - The `redirectUrl` should point to authentik's authorization endpoint
2. **Open the redirectUrl** in a browser
3. **Login** as `testuser` / `testpassword` on the authentik login page
4. **Consent** → authentik redirects back to `http://localhost:3001/api/auth/oidc/callback?code=...&state=...`
5. **Verify callback response**: `200` with `{ data: { accessToken, user } }`, `Set-Cookie` contains `organizrx_refresh`
6. **Verify user**: `user.group_id` should be `4` (testuser is in `organizrx-users`)
7. **Repeat** with `testadmin` → `user.group_id` should be `0` (testadmin is in `organizrx-admins`)

- [ ] **Step 6: Test OIDC error scenarios**

1. **OIDC disabled**: Disable OIDC in settings → `GET /api/auth/oidc` → `403` with `OIDC_DISABLED`
2. **Missing params**: `GET /api/auth/oidc/callback` (no code/state) → `400` with `OIDC_MISSING_PARAMS`
3. **Invalid state**: `GET /api/auth/oidc/callback?code=fake&state=fake` → `400` with `OIDC_INVALID_STATE`
4. **Provider error**: `GET /api/auth/oidc/callback?error=access_denied&error_description=User+denied` → `400` with `OIDC_PROVIDER_ERROR`

- [ ] **Step 7: Test OIDC account linking**

1. Login with local auth first (to get a JWT)
2. `POST /api/auth/oidc/link` with `Authorization: Bearer <jwt>` and body `{ "oidcSub": "test-sub-123" }`
3. Verify: `200` with `{ data: { success: true, message: 'OIDC account linked successfully' } }`
4. Without auth: `POST /api/auth/oidc/link` → `401`

- [ ] **Step 8: Test local auth**

1. `POST /api/auth/login` with `{ "username": "<wizard-admin>", "password": "<wizard-password>" }` → `200` with `{ data: { accessToken, user } }`
2. Wrong password → `401` with `INVALID_CREDENTIALS`
3. 5 wrong passwords → `429` with `ACCOUNT_LOCKED`
4. `POST /api/auth/refresh` with valid cookie → `200` with `{ data: { accessToken } }`
5. `POST /api/auth/logout` → `200` with `{ data: { success: true } }`
6. `GET /api/auth/me` with valid JWT → `200` with `{ data: { user } }`
7. `GET /api/auth/me` without JWT → `401`

- [ ] **Step 9: Test 2FA (TOTP)**

1. Login to get JWT
2. `POST /api/auth/2fa/setup` → `200` with `{ data: { secret, qrUri, backupCodes } }`
3. Generate TOTP code from the `secret` (use `oathtool --totp -b <secret>` or a TOTP app)
4. `POST /api/auth/2fa/verify-setup` with `{ "secret": "<secret>", "token": "<totp-code>" }` → `200` with `{ data: { success: true } }`
5. Logout and login again → should get `{ data: { requires_2fa: true, temp_token } }`
6. `POST /api/auth/2fa/verify` with `{ "temp_token": "<token>", "totp_code": "<code>" }` → `200` with `{ data: { accessToken, user } }`
7. `DELETE /api/auth/2fa` with `{ "password": "<password>" }` → `200` with `{ data: { success: true } }`

- [ ] **Step 10: Test LDAP (if LDAP server available)**

Skip this step if no LDAP server is available in the test stack. LDAP testing requires a separate LDAP directory (OpenLDAP/AD), which is not included in `docker-compose.test-auth.yml`. For automated route tests, LDAP calls are mocked.

- [ ] **Step 11: Test SSO cookies**

1. As admin: `GET /api/sso/services` → `200` with `{ data: { services } }`
2. As admin: `GET /api/sso/config` → `200` with `{ data: { config } }`
3. As admin: `PUT /api/sso/config` with `{ "service": "plex", "enabled": true }` → `200` with `{ data: { service } }`
4. As admin: `PUT /api/sso/config` with `{ "service": "nonexistent" }` → `400` with `INVALID_SERVICE`
5. As regular user: `GET /api/sso/cookies` → `200` with `{ data: { cookies, headers } }`
6. As non-admin: `GET /api/sso/services` → `403`

- [ ] **Step 12: Document bugs found and fix them**

If any manual test reveals a bug:

1. Document the exact endpoint, request, expected vs actual response
2. Fix the bug in the relevant route/service file
3. Restart the organizrx container: `docker compose -f docker-compose.test-auth.yml restart organizrx`
4. Re-verify the fix
5. Commit the fix with `fix: <description>` message

- [ ] **Step 13: Tear down the stack (optional)**

```bash
docker compose -f docker-compose.test-auth.yml down -v
```

Note: Keep the stack running if you want to continue debugging. The `-v` flag removes volumes (wipes all data).

---

## Chunk 3: OIDC Route Tests (Highest Priority)

### Task 4: Create `apps/server/src/routes/auth-oidc.spec.ts`

**Files:**

- Create: `apps/server/src/routes/auth-oidc.spec.ts`

**Pattern:** Follow `auth-plex.spec.ts` exactly — same `setupDb()`, `createApp()`, `beforeEach`/`afterEach`, `mock.module()` for service dependencies.

**Mocking strategy:**

- Mock `../services/auth-oidc/client` — `getOidcConfig`, `discoverOidcProvider`, `buildOidcAuthUrl`, `exchangeOidcCode`
- Mock `../services/auth-oidc/db` — `findOrCreateOidcUser`, `linkOidcAccount`
- Use **real** implementations for: `storeOidcState`, `retrieveAndDeleteOidcState`, `_resetOidcStateStore` (from `../services/auth-oidc/state`)
- Use **real** implementations for: `extractOidcUserInfo`, `mapOidcGroupsToOrganizr`, `getGroupNameById` (from `../services/auth-oidc/mapping`) — these are pure functions
- Use **real** implementations for: `createAccessToken`, `createRefreshToken`, `storeRefreshToken` (from `../services/auth`) — they use the test DB

- [ ] **Step 1: Create the test file**

```typescript
// apps/server/src/routes/auth-oidc.spec.ts
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'
import { Hono } from 'hono'

import { initDb, closeDb, getRawDb } from '../db'
import type { SqliteDb } from '../db'
import { initConfig, _resetConfig } from '../config'
import { _clearSettingsCache, setSetting } from '../services/settings'
import { _resetOidcStateStore, storeOidcState } from '../services/auth-oidc/state'
import type { OidcAuthState } from '../services/auth-oidc/state'
import oidcAuthRoutes from './auth-oidc'

// ---------------------------------------------------------------------------
// Mock setup — MUST be before imports that trigger module loading
// ---------------------------------------------------------------------------

// Mock the OIDC client module (external provider interaction)
const mockGetOidcConfig = mock(() =>
  Promise.resolve({
    enabled: true,
    providerUrl: 'http://fake-issuer.test',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    scopes: 'openid profile email groups',
    redirectUri: 'http://localhost:3001/api/auth/oidc/callback',
    groupClaim: 'groups',
    groupMapping: { 'organizrx-admins': 0, 'organizrx-users': 4 },
    autoCreateUser: true,
    defaultGroupId: 4,
  })
)

const mockDiscoverOidcProvider = mock(() => Promise.resolve({} as unknown))
const mockBuildOidcAuthUrl = mock(() =>
  Promise.resolve({
    url: 'http://fake-issuer.test/authorize?client_id=test-client-id&state=mock-state',
    state: 'mock-state',
    codeVerifier: 'mock-code-verifier',
    nonce: 'mock-nonce',
  })
)
const mockExchangeOidcCode = mock(() =>
  Promise.resolve({
    claims: {
      sub: 'oidc-user-sub-123',
      email: 'oidcuser@test.local',
      preferred_username: 'oidcuser',
      name: 'OIDC User',
      groups: ['organizrx-users'],
    },
    accessToken: 'oidc-access-token',
  })
)

mock.module('../services/auth-oidc/client', () => ({
  getOidcConfig: mockGetOidcConfig,
  discoverOidcProvider: mockDiscoverOidcProvider,
  buildOidcAuthUrl: mockBuildOidcAuthUrl,
  exchangeOidcCode: mockExchangeOidcCode,
}))

// Mock the OIDC DB module (user creation/linking)
const mockFindOrCreateOidcUser = mock(() =>
  Promise.resolve({
    id: 1,
    userID: 1,
    username: 'oidcuser',
    email: 'oidcuser@test.local',
    groupName: 'User',
    group_id: 4,
    image: null,
  })
)

const mockLinkOidcAccount = mock(() => Promise.resolve())

mock.module('../services/auth-oidc/db', () => ({
  findOrCreateOidcUser: mockFindOrCreateOidcUser,
  linkOidcAccount: mockLinkOidcAccount,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniqueDbPath(suffix = 'oidc-routes'): string {
  const dir = join(tmpdir(), 'organizrx-test-' + process.pid)
  mkdirSync(dir, { recursive: true })
  return join(dir, `test-${suffix}-${Date.now()}.db`)
}

async function setupDb() {
  _resetConfig()
  await initConfig()
  const dbPath = uniqueDbPath()
  await initDb({ dialect: 'sqlite', url: dbPath })

  const db = getRawDb() as SqliteDb

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      email TEXT,
      plex_token TEXT,
      "group" TEXT,
      group_id INTEGER,
      locked INTEGER,
      image TEXT,
      register_date TEXT,
      auth_service TEXT DEFAULT 'internal',
      totp_secret TEXT,
      totp_enabled INTEGER DEFAULT 0,
      totp_backup_codes TEXT
    )
  `)

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "group" TEXT UNIQUE,
      group_id INTEGER,
      image TEXT,
      "default" INTEGER
    )
  `)

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE,
      user_id INTEGER,
      browser TEXT,
      ip TEXT,
      created TEXT,
      expires TEXT
    )
  `)

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      value TEXT
    )
  `)

  db.$client.exec(`
    INSERT INTO groups (id, "group", group_id, "default") VALUES (4, 'User', 4, 1)
  `)

  return db
}

function createApp(): Hono {
  const app = new Hono()
  app.route('/api/auth', oidcAuthRoutes)
  return app
}

function resetAllMocks(): void {
  mockGetOidcConfig.mockReset()
  mockDiscoverOidcProvider.mockReset()
  mockBuildOidcAuthUrl.mockReset()
  mockExchangeOidcCode.mockReset()
  mockFindOrCreateOidcUser.mockReset()
  mockLinkOidcAccount.mockReset()

  // Restore default implementations after reset
  mockGetOidcConfig.mockImplementation(() =>
    Promise.resolve({
      enabled: true,
      providerUrl: 'http://fake-issuer.test',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      scopes: 'openid profile email groups',
      redirectUri: 'http://localhost:3001/api/auth/oidc/callback',
      groupClaim: 'groups',
      groupMapping: { 'organizrx-admins': 0, 'organizrx-users': 4 },
      autoCreateUser: true,
      defaultGroupId: 4,
    })
  )
  mockDiscoverOidcProvider.mockImplementation(() => Promise.resolve({} as unknown))
  mockBuildOidcAuthUrl.mockImplementation(() =>
    Promise.resolve({
      url: 'http://fake-issuer.test/authorize?client_id=test-client-id&state=mock-state',
      state: 'mock-state',
      codeVerifier: 'mock-code-verifier',
      nonce: 'mock-nonce',
    })
  )
  mockExchangeOidcCode.mockImplementation(() =>
    Promise.resolve({
      claims: {
        sub: 'oidc-user-sub-123',
        email: 'oidcuser@test.local',
        preferred_username: 'oidcuser',
        name: 'OIDC User',
        groups: ['organizrx-users'],
      },
      accessToken: 'oidc-access-token',
    })
  )
  mockFindOrCreateOidcUser.mockImplementation(() =>
    Promise.resolve({
      id: 1,
      userID: 1,
      username: 'oidcuser',
      email: 'oidcuser@test.local',
      groupName: 'User',
      group_id: 4,
      image: null,
    })
  )
  mockLinkOidcAccount.mockImplementation(() => Promise.resolve())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('auth-oidc routes', () => {
  beforeEach(async () => {
    await closeDb()
    _clearSettingsCache()
    _resetOidcStateStore()
    resetAllMocks()
  })

  afterEach(async () => {
    await closeDb()
    _clearSettingsCache()
    _resetOidcStateStore()
  })

  // -------------------------------------------------------------------------
  // GET /api/auth/oidc — Initiate OIDC authorization flow
  // -------------------------------------------------------------------------

  describe('GET /api/auth/oidc', () => {
    it('should return redirectUrl and state when OIDC is enabled', async () => {
      await setupDb()
      const app = createApp()

      const res = await app.request('/api/auth/oidc')
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.redirectUrl).toContain('http://fake-issuer.test/authorize')
      expect(json.data.state).toBe('mock-state')
    })

    it('should return 403 when OIDC is disabled', async () => {
      await setupDb()
      mockGetOidcConfig.mockImplementation(() =>
        Promise.resolve({
          enabled: false,
          providerUrl: '',
          clientId: '',
          clientSecret: '',
          scopes: '',
          redirectUri: '',
          groupClaim: '',
          groupMapping: {},
          autoCreateUser: false,
          defaultGroupId: 4,
        })
      )

      const app = createApp()
      const res = await app.request('/api/auth/oidc')
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.error.code).toBe('OIDC_DISABLED')
    })

    it('should return 500 when providerUrl is missing', async () => {
      await setupDb()
      mockGetOidcConfig.mockImplementation(() =>
        Promise.resolve({
          enabled: true,
          providerUrl: '',
          clientId: 'some-id',
          clientSecret: '',
          scopes: '',
          redirectUri: '',
          groupClaim: '',
          groupMapping: {},
          autoCreateUser: false,
          defaultGroupId: 4,
        })
      )

      const app = createApp()
      const res = await app.request('/api/auth/oidc')
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.error.code).toBe('OIDC_NOT_CONFIGURED')
    })

    it('should return 500 when clientId is missing', async () => {
      await setupDb()
      mockGetOidcConfig.mockImplementation(() =>
        Promise.resolve({
          enabled: true,
          providerUrl: 'http://fake-issuer.test',
          clientId: '',
          clientSecret: '',
          scopes: '',
          redirectUri: '',
          groupClaim: '',
          groupMapping: {},
          autoCreateUser: false,
          defaultGroupId: 4,
        })
      )

      const app = createApp()
      const res = await app.request('/api/auth/oidc')
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.error.code).toBe('OIDC_NOT_CONFIGURED')
    })

    it('should return 500 when discovery fails', async () => {
      await setupDb()
      mockDiscoverOidcProvider.mockImplementation(() =>
        Promise.reject(new Error('Discovery network error'))
      )

      const app = createApp()
      const res = await app.request('/api/auth/oidc')
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.error.code).toBe('OIDC_DISCOVERY_FAILED')
      expect(json.error.message).toBe('Discovery network error')
    })
  })

  // -------------------------------------------------------------------------
  // GET /api/auth/oidc/callback — Handle OIDC provider callback
  // -------------------------------------------------------------------------

  describe('GET /api/auth/oidc/callback', () => {
    // Helper: seed a valid PKCE state so callback can find it
    function seedState(state = 'valid-state'): OidcAuthState {
      const entry: OidcAuthState = {
        codeVerifier: 'test-verifier',
        state,
        nonce: 'test-nonce',
        createdAt: Date.now(),
      }
      storeOidcState(state, entry)
      return entry
    }

    it('should return accessToken and user on valid callback', async () => {
      await setupDb()
      seedState('valid-state')

      const app = createApp()
      const res = await app.request('/api/auth/oidc/callback?code=auth-code-123&state=valid-state')
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.accessToken).toBeDefined()
      expect(json.data.user.username).toBe('oidcuser')
      expect(json.data.user.email).toBe('oidcuser@test.local')
      // Refresh cookie should be set
      expect(res.headers.get('set-cookie')).toContain('organizrx_refresh=')
    })

    it('should return 403 when OIDC is disabled', async () => {
      await setupDb()
      mockGetOidcConfig.mockImplementation(() =>
        Promise.resolve({
          enabled: false,
          providerUrl: '',
          clientId: '',
          clientSecret: '',
          scopes: '',
          redirectUri: '',
          groupClaim: '',
          groupMapping: {},
          autoCreateUser: false,
          defaultGroupId: 4,
        })
      )

      const app = createApp()
      const res = await app.request('/api/auth/oidc/callback?code=auth-code&state=some-state')
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.error.code).toBe('OIDC_DISABLED')
    })

    it('should return 400 with OIDC_PROVIDER_ERROR when provider sends error', async () => {
      await setupDb()

      const app = createApp()
      const res = await app.request(
        '/api/auth/oidc/callback?error=access_denied&error_description=User+denied+consent'
      )
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('OIDC_PROVIDER_ERROR')
      expect(json.error.message).toBe('User denied consent')
    })

    it('should return 400 when code is missing', async () => {
      await setupDb()

      const app = createApp()
      const res = await app.request('/api/auth/oidc/callback?state=some-state')
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('OIDC_MISSING_PARAMS')
    })

    it('should return 400 when state is missing', async () => {
      await setupDb()

      const app = createApp()
      const res = await app.request('/api/auth/oidc/callback?code=auth-code')
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('OIDC_MISSING_PARAMS')
    })

    it('should return 400 with OIDC_INVALID_STATE when state is not found', async () => {
      await setupDb()
      // Do NOT seed any state — simulates invalid/expired state

      const app = createApp()
      const res = await app.request(
        '/api/auth/oidc/callback?code=auth-code&state=nonexistent-state'
      )
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('OIDC_INVALID_STATE')
    })

    it('should consume state on first use (one-shot)', async () => {
      await setupDb()
      seedState('one-shot-state')

      const app = createApp()

      // First request should succeed
      const res1 = await app.request(
        '/api/auth/oidc/callback?code=auth-code-1&state=one-shot-state'
      )
      expect(res1.status).toBe(200)

      // Second request with same state should fail — state was consumed
      const res2 = await app.request(
        '/api/auth/oidc/callback?code=auth-code-2&state=one-shot-state'
      )
      const json2 = await res2.json()

      expect(res2.status).toBe(400)
      expect(json2.error.code).toBe('OIDC_INVALID_STATE')
    })

    it('should return 400 with OIDC_NO_SUBJECT when claims have no sub', async () => {
      await setupDb()
      seedState('no-sub-state')

      mockExchangeOidcCode.mockImplementation(() =>
        Promise.resolve({
          claims: {
            email: 'nosub@test.local',
            preferred_username: 'nosub',
            // NOTE: no 'sub' field
          },
          accessToken: 'token',
        })
      )

      const app = createApp()
      const res = await app.request('/api/auth/oidc/callback?code=auth-code&state=no-sub-state')
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('OIDC_NO_SUBJECT')
    })

    it('should return 403 with OIDC_USER_DENIED when auto-create is disabled and user not found', async () => {
      await setupDb()
      seedState('no-auto-create-state')

      // findOrCreateOidcUser returns null when user doesn't exist and auto-create is off
      mockFindOrCreateOidcUser.mockImplementation(() => Promise.resolve(null))

      const app = createApp()
      const res = await app.request(
        '/api/auth/oidc/callback?code=auth-code&state=no-auto-create-state'
      )
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.error.code).toBe('OIDC_USER_DENIED')
    })

    it('should return 500 with OIDC_AUTH_FAILED when token exchange fails', async () => {
      await setupDb()
      seedState('exchange-fail-state')

      mockExchangeOidcCode.mockImplementation(() =>
        Promise.reject(new Error('Token exchange failed: invalid_client'))
      )

      const app = createApp()
      const res = await app.request(
        '/api/auth/oidc/callback?code=bad-code&state=exchange-fail-state'
      )
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.error.code).toBe('OIDC_AUTH_FAILED')
      expect(json.error.message).toBe('Token exchange failed: invalid_client')
    })

    it('should map admin group correctly', async () => {
      await setupDb()
      seedState('admin-group-state')

      // Claims contain admin group
      mockExchangeOidcCode.mockImplementation(() =>
        Promise.resolve({
          claims: {
            sub: 'admin-sub-456',
            email: 'admin@test.local',
            preferred_username: 'adminuser',
            name: 'Admin User',
            groups: ['organizrx-admins'],
          },
          accessToken: 'admin-access-token',
        })
      )

      // findOrCreateOidcUser should be called with group_id=0
      mockFindOrCreateOidcUser.mockImplementation((_info: unknown, groupId: number) => {
        // Verify the group mapping passed through correctly
        return Promise.resolve({
          id: 2,
          userID: 2,
          username: 'adminuser',
          email: 'admin@test.local',
          groupName: 'Admin',
          group_id: groupId, // Should be 0
          image: null,
        })
      })

      const app = createApp()
      const res = await app.request(
        '/api/auth/oidc/callback?code=admin-code&state=admin-group-state'
      )
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.user.group_id).toBe(0)
    })

    it('should use defaultGroupId when no group mapping matches', async () => {
      await setupDb()
      seedState('default-group-state')

      // Claims contain a group that has no mapping
      mockExchangeOidcCode.mockImplementation(() =>
        Promise.resolve({
          claims: {
            sub: 'unmapped-sub-789',
            email: 'unmapped@test.local',
            preferred_username: 'unmappeduser',
            name: 'Unmapped User',
            groups: ['some-other-group'],
          },
          accessToken: 'unmapped-token',
        })
      )

      mockFindOrCreateOidcUser.mockImplementation((_info: unknown, groupId: number) => {
        return Promise.resolve({
          id: 3,
          userID: 3,
          username: 'unmappeduser',
          email: 'unmapped@test.local',
          groupName: 'User',
          group_id: groupId, // Should be 4 (defaultGroupId)
          image: null,
        })
      })

      const app = createApp()
      const res = await app.request(
        '/api/auth/oidc/callback?code=unmapped-code&state=default-group-state'
      )
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.user.group_id).toBe(4)
    })
  })

  // -------------------------------------------------------------------------
  // POST /api/auth/oidc/link — Link authenticated user to OIDC identity
  // -------------------------------------------------------------------------

  describe('POST /api/auth/oidc/link', () => {
    it('should link OIDC account for authenticated user', async () => {
      await setupDb()

      const { createAccessToken, toAuthUser } = await import('../services/auth')
      const authUser = toAuthUser({
        id: 1,
        username: 'localuser',
        email: 'local@test.local',
        groupName: 'User',
        group_id: 4,
        image: null,
      })
      const jwt = await createAccessToken(authUser)

      const app = createApp()
      const res = await app.request('/api/auth/oidc/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ oidcSub: 'oidc-sub-for-link' }),
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.success).toBe(true)
      expect(json.data.message).toBe('OIDC account linked successfully')
      expect(mockLinkOidcAccount).toHaveBeenCalledWith(1, 'oidc-sub-for-link')
    })

    it('should return 400 when oidcSub is missing', async () => {
      await setupDb()

      const { createAccessToken, toAuthUser } = await import('../services/auth')
      const authUser = toAuthUser({
        id: 1,
        username: 'localuser',
        email: 'local@test.local',
        groupName: 'User',
        group_id: 4,
        image: null,
      })
      const jwt = await createAccessToken(authUser)

      const app = createApp()
      const res = await app.request('/api/auth/oidc/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({}),
      })
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 401 when not authenticated', async () => {
      await setupDb()

      const app = createApp()
      const res = await app.request('/api/auth/oidc/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oidcSub: 'some-sub' }),
      })
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 500 when linkOidcAccount throws', async () => {
      await setupDb()
      mockLinkOidcAccount.mockImplementation(() =>
        Promise.reject(new Error('DB constraint violation'))
      )

      const { createAccessToken, toAuthUser } = await import('../services/auth')
      const authUser = toAuthUser({
        id: 1,
        username: 'localuser',
        email: 'local@test.local',
        groupName: 'User',
        group_id: 4,
        image: null,
      })
      const jwt = await createAccessToken(authUser)

      const app = createApp()
      const res = await app.request('/api/auth/oidc/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ oidcSub: 'fail-sub' }),
      })
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.error.code).toBe('OIDC_LINK_FAILED')
      expect(json.error.message).toBe('DB constraint violation')
    })
  })
})
```

**Test case summary (18 tests total):**

| Group                | Test                                                 | Status                      | Method                           |
| -------------------- | ---------------------------------------------------- | --------------------------- | -------------------------------- |
| `GET /oidc`          | Happy path — returns redirectUrl + state             | `200`                       | Mock buildOidcAuthUrl            |
| `GET /oidc`          | OIDC disabled                                        | `403 OIDC_DISABLED`         | Mock getOidcConfig               |
| `GET /oidc`          | Missing providerUrl                                  | `500 OIDC_NOT_CONFIGURED`   | Mock getOidcConfig               |
| `GET /oidc`          | Missing clientId                                     | `500 OIDC_NOT_CONFIGURED`   | Mock getOidcConfig               |
| `GET /oidc`          | Discovery fails                                      | `500 OIDC_DISCOVERY_FAILED` | Mock discoverOidcProvider throws |
| `GET /oidc/callback` | Valid callback — returns accessToken + user + cookie | `200`                       | Seeded state + mocks             |
| `GET /oidc/callback` | OIDC disabled                                        | `403 OIDC_DISABLED`         | Mock getOidcConfig               |
| `GET /oidc/callback` | Provider sends error param                           | `400 OIDC_PROVIDER_ERROR`   | Query string `?error=`           |
| `GET /oidc/callback` | Missing code param                                   | `400 OIDC_MISSING_PARAMS`   | No `code` in query               |
| `GET /oidc/callback` | Missing state param                                  | `400 OIDC_MISSING_PARAMS`   | No `state` in query              |
| `GET /oidc/callback` | Invalid state                                        | `400 OIDC_INVALID_STATE`    | State not in store               |
| `GET /oidc/callback` | One-shot state consumption                           | `200` then `400`            | Same state used twice            |
| `GET /oidc/callback` | No sub in claims                                     | `400 OIDC_NO_SUBJECT`       | Mock claims without sub          |
| `GET /oidc/callback` | Auto-create disabled + unknown user                  | `403 OIDC_USER_DENIED`      | Mock null return                 |
| `GET /oidc/callback` | Token exchange fails (wrong secret)                  | `500 OIDC_AUTH_FAILED`      | Mock throws                      |
| `GET /oidc/callback` | Admin group mapping                                  | `200` with `group_id: 0`    | Claims with admin group          |
| `GET /oidc/callback` | Default group fallback                               | `200` with `group_id: 4`    | Claims with unmapped group       |
| `POST /oidc/link`    | Authenticated link                                   | `200` with success message  | JWT + oidcSub body               |
| `POST /oidc/link`    | Missing oidcSub                                      | `400 VALIDATION_ERROR`      | Empty body                       |
| `POST /oidc/link`    | Not authenticated                                    | `401 UNAUTHORIZED`          | No Authorization header          |
| `POST /oidc/link`    | linkOidcAccount throws                               | `500 OIDC_LINK_FAILED`      | Mock throws                      |

- [ ] **Step 2: Verify the test file compiles**

Run: `bunx tsc --noEmit apps/server/src/routes/auth-oidc.spec.ts`

Expected: No type errors.

- [ ] **Step 3: Run the tests**

Run: `bun test apps/server/src/routes/auth-oidc.spec.ts`

Expected: All 18 tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/routes/auth-oidc.spec.ts
git commit -m "test: add OIDC route tests with full coverage of auth flow"
```
