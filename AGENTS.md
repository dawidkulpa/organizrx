# AGENTS.md

## Project Overview
OrganizrX is a TypeScript and Bun monorepo rebuilding the legacy PHP Organizr media server dashboard.
- **Backend:** Hono running on Bun
- **Frontend:** React SPA with Vite and Tailwind CSS v4
- **Database:** Drizzle ORM supporting SQLite, MySQL, and PostgreSQL via a unified adapter pattern
- **Runtime:** Bun (replaces Node.js for execution, testing, and bundling)

## Monorepo Navigation
- `apps/server`: Hono API and database management
- `apps/web`: React frontend
- `packages/shared`: Shared Zod schemas, TypeScript types, and constants
- `packages/plugin-sdk`: Interfaces and contracts for the plugin system
- `plugins/packages`: Official and community plugin implementations
- `docs`: Documentation site built with Docusaurus

## Setup & Commands
- `bun install`: Install all workspace dependencies
- `bun run dev`: Start server (3001) and web (5173) in watch mode
- `bun test`: Execute unit and integration tests across the workspace
- `bun run build`: Build production artifacts for server and web
- `bun run check`: Run TypeScript type checking across all packages
- `bun run docs:dev`: Start local Docusaurus development server

## Import Path Conventions
- `@organizrx/shared`: Use for all shared logic, types, and schemas
- `@organizrx/plugin-sdk`: Use for plugin development contracts
- **Internal Imports:** Use relative paths (e.g., `../../components/button`) within the same app or package

## Code Style
- **Strict TypeScript:** All `tsconfig.json` files must have `strict: true`
- **Formatting:** 2-space indentation, single quotes, no semicolons (unless required for ASI)
- **Naming Conventions:**
  - `kebab-case.ts`: File and directory names
  - `PascalCase`: React components, Types, Interfaces
  - `camelCase`: Functions, variables, and instances
  - `snake_case`: Database columns (to maintain compatibility with legacy schemas)

## Error Handling
- Use custom error classes that extend the project's base `AppError`.
- **Never swallow errors:** Avoid empty catch blocks; log or rethrow.
- **Input Validation:** Use Zod to validate all external input (API requests, environment variables, configuration).
- **Standardized Response:** Error responses must follow the format `{ error: { code: string, message: string } }`.

## Testing
- Co-locate tests with source files using the `*.spec.ts` or `*.spec.tsx` suffix.
- Use `bun test` for execution.
- Mock all external dependencies (DB, network, file system) in unit tests.

## DB Migration Workflow
1. Modify schema in `apps/server/src/db/schema/`.
2. Run `bunx drizzle-kit generate` to create migration files.
3. Run `bunx drizzle-kit push` to apply changes to the development database.
4. Commit both schema changes and generated migration files.

## PR & Git Guidelines
- **Conventional Commits:** `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `security:`
- **Branching:** `feature/description` or `fix/description`.
- **Atomic Commits:** Prefer small, focused commits over large changesets.
- **Location:** All git operations must be performed within the `organizrx` directory.

## Security Rules
- **No Secrets:** Never hardcode credentials. Use environment variables for all secrets.
- **Authentication:** JWT via `jose` library. Support RS256 or HS256. Algorithm `none` is strictly forbidden.
- **Hashing:** Bcrypt with a minimum of 12 rounds for password storage.
- **Protection:**
  - Rate limit all authentication endpoints.
  - Zod validation on every API endpoint.
  - SSRF Protection: Block cloud metadata endpoints and non-HTTP schemes. Allow private IPs (intended for home-lab use).
  - CORS: Use an explicit origin whitelist. Never use `*` in production.
- **SQL Safety:** All database interaction must go through Drizzle ORM. No raw SQL strings allowed.

## Workspace & Execution
- All work and file creation must happen within the `organizrx` repository root. Never create files outside this workspace.
- Never downgrade packages; always target the latest stable versions.

## Prohibited Patterns (Do Not)
- No `as any` or `@ts-ignore`: Maintain full type safety.
- No `console.log` in production: Use the structured JSON logger.
- No Raw SQL: Use the Drizzle query builder exclusively.
- Module Size: Split files exceeding 300 lines into smaller modules.
- No Legacy Tech: No jQuery or direct, unmanaged DOM manipulation.
- No PHP Patterns: Avoid god-classes, traits-as-modules, or PHP-style configuration arrays.
- Iframes: No unmanaged `<iframe>` without appropriate `sandbox` attributes.
- No package downgrades.
