# Spec: Auth Mechanism Testing — All Providers (Authentik-First)

## Overview

Comprehensive testing of all authentication mechanisms in OrganizrX, with authentik OIDC as the highest priority. The approach is manual testing first (verify everything works end-to-end), fix bugs, then write automated route-level tests for future regression.

## Scope

### In Scope

- Manual end-to-end testing of all 7 auth-related mechanisms (6 auth + SSO cookies)
- A separate `docker-compose.test-auth.yml` with 5 containers: OrganizrX, authentik-server, authentik-worker, PostgreSQL (for authentik), and Redis (for authentik)
- Automated route-level tests for mechanisms that lack them (OIDC, local auth, 2FA, LDAP, auth proxy middleware, SSO)
- Bug fixes discovered during manual testing

### Out of Scope

- Frontend E2E / browser tests
- Load testing or performance benchmarks
- Architecture changes to auth system
- Testcontainers-based integration tests
- Changes to existing `docker-compose.yml` or `docker-compose.test.yml`

## Auth Mechanisms (Priority Order)

| #   | Mechanism        | Type                | Service Tests | Route Tests | Priority      |
| --- | ---------------- | ------------------- | :-----------: | :---------: | ------------- |
| 1   | OIDC (authentik) | Login               |      ✅       |     ❌      | **Highest**   |
| 2   | Local Auth       | Login               |      ✅       |     ❌      | High          |
| 3   | 2FA (TOTP)       | Login supplement    |      ✅       |     ❌      | High          |
| 4   | Plex OAuth       | Login               |      ✅       |     ✅      | Low (covered) |
| 5   | LDAP/AD          | Login               |      ✅       |     ❌      | Medium        |
| 6   | Auth Proxy       | Middleware          |      ✅       |     ❌      | Medium        |
| 7   | SSO Cookies      | Session propagation |      ✅       |     ❌      | Medium        |

Note: SSO Cookies is not a standalone login mechanism — it propagates authenticated sessions to downstream services (Plex, Jellyfin, etc.) via Set-Cookie headers.

## Phase 1: Docker Compose for Auth Testing

### File: `docker-compose.test-auth.yml`

A standalone compose file with 5 containers:

1. **authentik-db** — PostgreSQL 16 for authentik's internal state
2. **authentik-redis** — Redis 7 for authentik's cache/broker
3. **authentik-server** — Authentik server (`ghcr.io/goauthentik/server:latest`)
4. **authentik-worker** — Authentik worker (same image, `worker` command)
5. **organizrx** — Built from the project Dockerfile, configured with SQLite

### Authentik Bootstrap Configuration

Authentik will be configured via a **Blueprint** (YAML file mounted to `/blueprints/custom/`) which runs on first boot:

- **Provider**: OAuth2/OIDC provider with:
  - Client ID: `organizrx-test`
  - Client Secret: `organizrx-test-secret`
  - Redirect URIs: `http://localhost:3001/api/auth/oidc/callback`
  - Scopes: `openid profile email`
  - Signing Key: auto-generated RSA key
  - Subject mode: Based on user ID
- **Application**: `organizrx-test` linked to the OIDC provider
  - Slug: `organizrx-test`
  - Launch URL: `http://localhost:3001`
- **Test Users**:
  - `testadmin` / `testpassword` — member of `organizrx-admins`
  - `testuser` / `testpassword` — member of `organizrx-users`
- **Groups**: `organizrx-admins`, `organizrx-users`
- **Property Mapping**: Custom scope mapping to include `groups` claim in ID token (using `goauthentik.io/user/groups` or a custom scope)

### OrganizrX OIDC Settings Seeding

`getOidcConfig()` loads OIDC configuration from the **DB settings table** (not environment variables). The settings keys are:

| Setting Key             | Value                                                        |
| ----------------------- | ------------------------------------------------------------ |
| `oidc_enabled`          | `true`                                                       |
| `oidc_provider_url`     | `http://authentik-server:9000/application/o/organizrx-test/` |
| `oidc_client_id`        | `organizrx-test`                                             |
| `oidc_client_secret`    | `organizrx-test-secret`                                      |
| `oidc_scopes`           | `openid profile email`                                       |
| `oidc_redirect_uri`     | `http://localhost:3001/api/auth/oidc/callback`               |
| `oidc_group_claim`      | `groups`                                                     |
| `oidc_group_mapping`    | `{"organizrx-admins": 0, "organizrx-users": 4}`              |
| `oidc_auto_create_user` | `true`                                                       |
| `oidc_default_group_id` | `4`                                                          |

**Seeding method**: Run the OrganizrX setup wizard manually after containers start. This is the only supported method for manual testing. The wizard creates the database and admin user, after which OIDC settings can be configured via the Settings → Authentication page.

For automated route-level tests, DB settings are seeded programmatically via `setupDb()` + direct settings table inserts — the docker-compose is not used for automated tests.

### OIDC Discovery URL Contract

The `oidc_provider_url` must be a URL that `openid-client.discovery()` can use to fetch `/.well-known/openid-configuration`. For authentik, this is the application's OpenID Connect issuer URL, typically `http://authentik-server:9000/application/o/<slug>/`.

### Usage

```bash
# Start the full auth testing stack (5 containers)
docker compose -f docker-compose.test-auth.yml up -d

# Wait for healthy (authentik takes ~60s on first boot)
docker compose -f docker-compose.test-auth.yml ps

# Access:
# OrganizrX:  http://localhost:3001
# Authentik:  http://localhost:9000  (admin: akadmin / set via AUTHENTIK_BOOTSTRAP_PASSWORD)

# Cleanup
docker compose -f docker-compose.test-auth.yml down -v
```

## Phase 2: Manual Testing

### 2.1 Authentik OIDC (Highest Priority)

**Happy path:**

1. Navigate to OrganizrX login → click "Sign in with SSO"
2. Redirect to authentik login page at `localhost:9000`
3. Authenticate as `testuser` / `testpassword`
4. Redirect back to OrganizrX with auth code
5. **Verify**: Response contains `accessToken` + `user` object, `Set-Cookie` contains `organizrx_refresh`, user row exists in DB with `group_id=4`

**Error scenarios:**

- Cancel the authentik consent → verify response: `400` with `OIDC_PROVIDER_ERROR`
- Tamper with `state` query parameter → verify response: `400` with `OIDC_INVALID_STATE`
- Send callback with missing `code` → verify response: `400` with `OIDC_MISSING_PARAMS`
- Disable OIDC in settings → verify response: `403` with `OIDC_DISABLED`
- Remove `oidc_client_id` from settings → verify response: `500` with `OIDC_NOT_CONFIGURED`
- Use wrong client secret → verify response: `500` with `OIDC_DISCOVERY_FAILED` or `OIDC_AUTH_FAILED`

**Group mapping:**

- `testadmin` in `organizrx-admins` → `group_id=0` (Admin)
- `testuser` in `organizrx-users` → `group_id=4` (User)
- User with no mapped group → falls back to `defaultGroupId=4`

**Account linking:**

- `POST /api/auth/oidc/link` with `{ oidcSub: "<sub>" }` while authenticated → verify response: `200` with `{ data: { success: true } }`
- Attempt without authentication → verify response: `401`

### 2.2 Local Auth

**POST /api/auth/login:**

- Valid credentials → `200` with `accessToken` + `user` + `Set-Cookie: organizrx_refresh`
- Wrong password → `401` with `INVALID_CREDENTIALS` + lockout counter incremented
- 5 failed attempts → `429` with `ACCOUNT_LOCKED`
- Disabled user (locked=1) → `403` with `ACCOUNT_DISABLED`
- User with 2FA enabled → `200` with `{ requires_2fa: true, temp_token: "..." }` (no JWT yet)
- `rememberMe: true` → refresh cookie with extended max-age

**POST /api/auth/refresh:**

- Valid refresh cookie → `200` with new `accessToken` + rotated `Set-Cookie`
- Missing cookie → `401` with `MISSING_TOKEN`
- Revoked token → `401` with `TOKEN_REVOKED`
- Expired/invalid token → `401` with `INVALID_TOKEN`

**POST /api/auth/logout:**

- With valid cookie → `200` with `{ success: true }`, `Set-Cookie` clears `organizrx_refresh`, SSO cookies cleared
- Without cookie → `200` (graceful no-op)

**GET /api/auth/me:**

- Valid JWT → `200` with user data
- Invalid/missing JWT → `401`

### 2.3 2FA (TOTP)

**POST /api/auth/2fa/setup** (requires auth):

- Returns `secret`, `qrUri`, `backupCodes`
- If 2FA already enabled → `400` with `TWO_FACTOR_ALREADY_ENABLED`

**POST /api/auth/2fa/verify-setup** (requires auth):

- Valid TOTP code + secret → `200` with `{ success: true }`, 2FA now enabled
- Invalid TOTP code → `401` with `INVALID_TOTP_CODE`

**POST /api/auth/2fa/verify** (no auth required — uses temp_token):

- Valid `temp_token` + `totp_code` → `200` with `accessToken` + `user` + refresh cookie
- Valid `temp_token` + `backup_code` → `200` (same), backup code consumed
- Invalid `temp_token` → `401` with `INVALID_TOKEN`
- Invalid TOTP code → `401` with `INVALID_CODE`
- Neither `totp_code` nor `backup_code` provided → `400` with `VALIDATION_ERROR`

**DELETE /api/auth/2fa** (requires auth):

- Valid password → `200` with `{ success: true }`, 2FA disabled
- Invalid password → `401` with `INVALID_PASSWORD`
- 2FA not enabled → `400` with `TWO_FACTOR_NOT_ENABLED`

### 2.4 Plex OAuth

- Already has route-level tests. Manual verification only:
- Initiate → get PIN → poll → callback → JWT issued

### 2.5 LDAP/AD

**POST /api/auth/ldap/test** (admin-only, requires auth + group 0):

- Valid LDAP config → `200` with `{ success: true, message: "..." }`
- Invalid config → `400` with `LDAP_CONNECTION_FAILED`
- Non-admin user → `403`
- Unauthenticated → `401`

**POST /api/auth/ldap/login:**

- Valid LDAP credentials → `200` with `accessToken` + `user` + refresh cookie
- Invalid credentials → `401` with `INVALID_CREDENTIALS`, lockout counter incremented
- LDAP disabled → `400` with `LDAP_DISABLED`
- Lockout → `429` with `ACCOUNT_LOCKED`
- LDAP server error → `500` with `LDAP_ERROR`

### 2.6 Auth Proxy Middleware

The middleware does **NOT reject** requests — it either attaches a user to the context (proxy auth succeeded) or passes through to normal auth middleware.

- Request with `X-Forwarded-User` header from whitelisted IP → user attached to context, normal auth skipped
- Request with header from non-whitelisted IP → passes through to normal auth (no rejection)
- Request without header → passes through to normal auth (no rejection)
- DB not ready (first-run) → passes through silently

### 2.7 SSO Cookies

**GET /api/sso/services** (admin-only, requires auth + group 0):

- Returns list of configurable SSO services
- Non-admin → `403`

**GET /api/sso/config** (admin-only, requires auth + group 0):

- Returns current SSO configuration per service

**PUT /api/sso/config** (admin-only, requires auth + group 0):

- Updates SSO config for a specific service (enabled, cookie_name, cookie_domain, cookie_path)
- Invalid service name → `400` with `INVALID_SERVICE`
- Validation error → `400` with `VALIDATION_ERROR`

**GET /api/sso/cookies** (requires auth):

- Returns SSO cookies for the authenticated user's downstream services
- Includes cookie names, domains, paths, and Set-Cookie headers

## Phase 3: Automated Route-Level Tests

### Test Infrastructure

All route tests follow existing conventions:

- **Runner**: `bun:test` with `describe`/`it`/`expect`
- **DB**: `setupDb()` creates temp SQLite per test suite, settings seeded via direct table inserts
- **Mocking**: `mock()` from `bun:test` for external HTTP calls
- **Route testing**: `app.request(path, init)` on Hono app instance
- **Isolation**: `_reset*()` functions between tests
- **Location**: Co-located with route files in `apps/server/src/routes/`

### 3.1 OIDC Route Tests (`apps/server/src/routes/auth-oidc.spec.ts`)

Mock the `openid-client` module to avoid real OIDC discovery.

**GET /oidc (initiate):**

- OIDC enabled + configured → `200` with `{ redirectUrl, state }`, state stored in memory
- OIDC disabled → `403` with `OIDC_DISABLED`
- Missing providerUrl or clientId → `500` with `OIDC_NOT_CONFIGURED`
- Discovery fails (mock throws) → `500` with `OIDC_DISCOVERY_FAILED`

**GET /oidc/callback:**

- Valid code + state + mocked token exchange → `200` with `{ accessToken, user }`, `Set-Cookie` with refresh token, user row created in DB
- Provider error query param → `400` with `OIDC_PROVIDER_ERROR`
- Missing code or state → `400` with `OIDC_MISSING_PARAMS`
- Invalid/expired state → `400` with `OIDC_INVALID_STATE`
- State consumed on first use (one-shot) → second callback with same state returns `OIDC_INVALID_STATE`
- No `sub` in claims → `400` with `OIDC_NO_SUBJECT`
- Auto-create disabled + user not found → `403` with `OIDC_USER_DENIED`
- Token exchange fails (mock throws) → `500` with `OIDC_AUTH_FAILED`
- OIDC disabled on callback → `403` with `OIDC_DISABLED`
- Group mapping: claims with `groups: ["organizrx-admins"]` → user created with `group_id=0`
- Group mapping: no matching groups → user created with `defaultGroupId`

**POST /oidc/link:**

- Authenticated + valid `{ oidcSub }` → `200` with `{ success: true }`
- Missing/invalid oidcSub → `400` with `VALIDATION_ERROR`
- Unauthenticated → `401`
- Linking fails (mock throws) → `500` with `OIDC_LINK_FAILED`

### 3.2 Local Auth Route Tests (`apps/server/src/routes/auth.spec.ts`)

**POST /auth/login:**

- Valid credentials → `200` with `accessToken` + `user`, `Set-Cookie` with refresh token, SSO cookies appended
- Wrong password → `401` with `INVALID_CREDENTIALS`
- Non-existent user → `401` with `INVALID_CREDENTIALS`
- Disabled user (locked=1) → `403` with `ACCOUNT_DISABLED`
- 5 failed attempts → `429` with `ACCOUNT_LOCKED`
- User with 2FA enabled → `200` with `{ requires_2fa: true, temp_token }` (no accessToken)
- `rememberMe: true` → extended refresh cookie max-age
- Invalid body (schema fail) → `400` with `VALIDATION_ERROR`

**POST /auth/refresh:**

- Valid refresh cookie → `200` with new `accessToken`, rotated cookie
- Missing cookie → `401` with `MISSING_TOKEN`
- Revoked token → `401` with `TOKEN_REVOKED`
- User deleted after token issued → `401` with `USER_NOT_FOUND`
- Expired/invalid JWT → `401` with `INVALID_TOKEN`

**POST /auth/logout:**

- With cookie → `200`, cookie cleared, SSO cookies cleared
- Without cookie → `200` (graceful)

**GET /auth/me:**

- Valid JWT → `200` with user
- Missing JWT → `401`
- User deleted → `401` with `USER_NOT_FOUND`

### 3.3 2FA Route Tests (`apps/server/src/routes/auth-2fa.spec.ts`)

**POST /2fa/setup:**

- Authenticated, no 2FA → `200` with `{ secret, qrUri, backupCodes }`
- 2FA already enabled → `400` with `TWO_FACTOR_ALREADY_ENABLED`
- Unauthenticated → `401`
- User not found → `404` with `USER_NOT_FOUND`

**POST /2fa/verify-setup:**

- Valid TOTP code → `200` with `{ success: true }`
- Invalid TOTP code → `401` with `INVALID_TOTP_CODE`
- Unauthenticated → `401`
- Validation error → `400`

**POST /2fa/verify:**

- Valid temp_token + totp_code → `200` with `accessToken` + `user` + refresh cookie
- Valid temp_token + backup_code → `200`, backup code consumed (fewer remaining)
- Invalid temp_token → `401` with `INVALID_TOKEN`
- Invalid totp_code → `401` with `INVALID_CODE`
- Neither code provided → `400` with `VALIDATION_ERROR`
- 2FA not enabled for user → `400` with `TWO_FACTOR_NOT_ENABLED`

**DELETE /2fa:**

- Valid password → `200` with `{ success: true }`
- Invalid password → `401` with `INVALID_PASSWORD`
- 2FA not enabled → `400` with `TWO_FACTOR_NOT_ENABLED`
- Unauthenticated → `401`

### 3.4 LDAP Route Tests (`apps/server/src/routes/auth-ldap.spec.ts`)

Mock `ldapts` module.

**POST /ldap/test:**

- Admin + valid config → `200` with `{ success: true }`
- Invalid config → `400` with `LDAP_CONNECTION_FAILED`
- Non-admin (group > 0) → `403`
- Unauthenticated → `401`
- Validation error → `400`

**POST /ldap/login:**

- LDAP enabled + valid credentials → `200` with `accessToken` + `user` + refresh cookie
- Invalid credentials → `401` with `INVALID_CREDENTIALS`
- LDAP disabled → `400` with `LDAP_DISABLED`
- Lockout → `429` with `ACCOUNT_LOCKED`
- LDAP server throws → `500` with `LDAP_ERROR`
- Validation error → `400`

### 3.5 Auth Proxy Middleware Tests (`apps/server/src/middleware/auth-proxy.spec.ts`)

- Valid proxy header + whitelisted IP → user attached to context, handler receives authenticated user
- Valid proxy header + non-whitelisted IP → passes through, handler does NOT receive proxy user
- No proxy header → passes through, handler does NOT receive proxy user
- DB not ready (authenticateProxyUser throws) → passes through silently
- Token verification fails after proxy auth → passes through

### 3.6 SSO Route Tests (`apps/server/src/routes/sso.spec.ts`)

**GET /sso/services:**

- Admin → `200` with services list
- Non-admin → `403`
- Unauthenticated → `401`

**GET /sso/config:**

- Admin → `200` with config array
- Non-admin → `403`
- Unauthenticated → `401`

**PUT /sso/config:**

- Admin + valid body → `200` with updated service config
- Invalid service name → `400` with `INVALID_SERVICE`
- Validation error → `400`
- Non-admin → `403`
- Unauthenticated → `401`

**GET /sso/cookies:**

- Authenticated → `200` with cookies + Set-Cookie headers
- Unauthenticated → `401`

## Success Criteria

1. **Docker compose**: `docker compose -f docker-compose.test-auth.yml up -d` starts all 5 containers, `docker compose ps` shows all healthy within 120s
2. **Authentik reachable**: `http://localhost:9000` returns the authentik login page, OIDC discovery at `http://localhost:9000/application/o/organizrx-test/.well-known/openid-configuration` returns valid JSON
3. **Manual OIDC flow**: Full initiate → authentik login → callback → JWT issued. Response includes `accessToken`, user object with correct `group_id`, and `Set-Cookie: organizrx_refresh`
4. **Manual local auth**: Login → refresh → me → logout all return expected status codes and response shapes
5. **Manual 2FA**: Setup → verify-setup → login-with-2FA → verify → disable all work
6. **Automated tests**: All new route-level test files pass: `bun test` exits 0
7. **Type safety**: `bun run check` exits 0 with no new type errors
8. **No regressions**: Existing service-level tests continue to pass
