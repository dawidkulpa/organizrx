# Backend Conventions

## Hono Route Patterns
- Use the Hono `App` factory pattern to group routes by resource (e.g., `/api/auth/*`, `/api/users/*`).
- Mount individual route groups to the main app instance for modularity.

## Middleware & Authorization
- `authMiddleware`: Use this on protected routes to validate the JWT.
- `requireGroup(minGroupId)`: Use this for fine-grained authorization based on user group IDs.

## Request & Response
- **Request Validation:** Every endpoint must use Zod schemas from `@organizrx/shared` to validate the body, query, and path parameters before any handler logic.
- **Success Envelope:** All successful API responses must follow the format `{ data: T, meta?: { page, total } }`.
- **Error Response:** Use standard HTTP status codes (400, 401, 403, 404, 500) and a structured error body. Never expose stack traces in the response.

## Authentication Logic
- Use the `jose` library for all JWT operations.
- **Expiration:** Access tokens expire in 15 minutes; refresh tokens in 7 days.
- **Tokens Table:** Store refresh tokens in the `tokens` database table.
- **Refresh Token Cookie:** Refresh tokens are delivered as `Set-Cookie: organizrx_refresh=<token>; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=<seconds>`. Use `buildRefreshCookie()` / `buildClearRefreshCookie()` from `services/refresh-cookie.ts`. The `/auth/refresh` endpoint reads the token from the cookie via `getCookie(c, 'organizrx_refresh')`, NOT from the request body.
- **CORS:** The server entry point (`index.ts`) applies `cors({ origin: corsOrigins, credentials: true })` to `/api/*` so that the browser sends the httpOnly cookie cross-origin.
- **Legacy Migration:** Handle legacy PHP `$2y$` Bcrypt prefixes for password compatibility during migration.

## Database & Drizzle ORM
- **Query Builder:** Use Drizzle's query builder exclusively. No raw SQL strings.
- **Transactions:** Use transactions for all operations involving multiple table writes.
- **Prepared Statements:** Utilize prepared statements for frequently executed queries to improve performance.
- **Adapter Pattern:** Use the unified schema adapter (see `src/db/schema/adapter.ts`) for multi-dialect support (SQLite, MySQL, PostgreSQL).

## Logging & Configuration
- **Logging:** Use `pino` for structured JSON logging. Include the request ID in all log entries for traceability.
- **Config Tiers:**
  - **Level 1:** Environment variables for secrets and core infrastructure.
  - **Level 2:** Typed configuration files for application-wide settings.
  - **Level 3:** Database options table for runtime settings.
- **Access:** Use `getConfig()`, `getSetting(key)`, or `setSetting(key, value)` to manage configuration.

## Prohibited Patterns (Do Not)
- No raw SQL strings.
- No `console.log`: Always use the structured logger.
- No unvalidated input: Always use Zod before processing.
- No secrets in configuration files: Secrets belong in environment variables only.
- No direct schema imports: Always use the shared schemas from `@organizrx/shared`.
- No large handlers: Keep route handlers small and delegate logic to services.
