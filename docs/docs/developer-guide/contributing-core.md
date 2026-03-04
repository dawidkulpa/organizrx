---
sidebar_position: 7
---

# Contributing to Core

This guide covers how to contribute new features to OrganizrX core: adding API endpoints, frontend pages, database tables, and the review checklist your PR must pass.

## Development Setup

```bash
# Clone and install
git clone https://github.com/organizrx/organizrx.git
cd organizrx
bun install

# Start dev servers (API on :3001, Web on :5173)
bun run dev

# Run tests
bun test

# Type check
bun run check
```

## Adding a New API Endpoint

### Step 1: Create the Route File

Create a new route module in `apps/server/src/routes/`:

```typescript
// apps/server/src/routes/my-feature.ts
import { Hono } from 'hono'
import { authMiddleware, requireGroup } from '../middleware/auth'
import { db } from '../db'
import { z } from 'zod'

const myFeatureRoutes = new Hono()

// Input validation schema
const createSchema = z.object({
  name: z.string().min(1).max(255),
  value: z.number().int().positive(),
})

// GET /api/my-feature - List all (requires User group)
myFeatureRoutes.get('/', authMiddleware, requireGroup(4), async (c) => {
  const items = await db.select().from(myTable)
  return c.json({ data: items })
})

// POST /api/my-feature - Create (requires Admin group)
myFeatureRoutes.post('/', authMiddleware, requireGroup(0), async (c) => {
  const body = await c.req.json()
  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
      },
      400
    )
  }

  const [item] = await db.insert(myTable).values(parsed.data).returning()
  return c.json({ data: item }, 201)
})

export { myFeatureRoutes }
```

### Step 2: Register the Route

Add the route to `apps/server/src/index.ts`:

```typescript
import { myFeatureRoutes } from './routes/my-feature'

// Add with other route registrations
app.route('/api/my-feature', myFeatureRoutes)
```

### Step 3: Write Tests

Co-locate the test file:

```typescript
// apps/server/src/routes/my-feature.spec.ts
import { describe, it, expect } from 'bun:test'

describe('my-feature routes', () => {
  it('should return 401 without auth', async () => {
    const res = await fetch('http://localhost:3001/api/my-feature')
    expect(res.status).toBe(401)
  })
})
```

## Adding a New Frontend Page

### Step 1: Create the Page Component

```typescript
// apps/web/src/pages/my-feature.tsx
import { api } from '../api/client'
import { useAuthStore } from '../store'

export function MyFeaturePage() {
  const user = useAuthStore((s) => s.user)

  // Fetch data, render UI
  return (
    <div>
      <h1>My Feature</h1>
      {/* page content */}
    </div>
  )
}
```

### Step 2: Add the Route

Register the route in `apps/web/src/router.tsx`:

```typescript
import { MyFeaturePage } from './pages/my-feature'

// Add to the route tree
{
  path: '/my-feature',
  element: <MyFeaturePage />,
}
```

### Step 3: Add Navigation

Add a sidebar link or settings menu entry as appropriate for the feature's location in the UI hierarchy.

## Adding a New Database Table

### Step 1: Define the Schema

Add the table definition to `apps/server/src/db/schema/tables.ts` using the dialect adapter:

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
// Or use the adapter for multi-dialect support:
import { adapter } from './adapter'

export const myTable = sqliteTable('my_table', {
  id: adapter.pk('id'),
  name: adapter.text('name').notNull(),
  value: adapter.integer('value').notNull(),
  created_at: adapter.datetime('created_at').notNull(),
})
```

### Step 2: Generate and Apply Migration

```bash
# Generate the migration SQL
bunx drizzle-kit generate

# Apply to development database
bunx drizzle-kit push
```

### Step 3: Commit Both Files

Always commit the schema change (`tables.ts`) and the generated migration file (`apps/server/drizzle/`) together.

## Code Conventions

### File Naming

| Pattern         | Usage                               |
| --------------- | ----------------------------------- |
| `kebab-case.ts` | File and directory names            |
| `PascalCase`    | React components, types, interfaces |
| `camelCase`     | Functions, variables, instances     |
| `snake_case`    | Database columns                    |

### TypeScript

- **Strict mode**: All `tsconfig.json` files have `strict: true`.
- **No `as any`**: Never use type assertions to `any`. Fix the types instead.
- **No `@ts-ignore`**: If the compiler complains, resolve the issue rather than suppressing it.

### Error Handling

- Use custom error classes extending the project's base `AppError`.
- Never swallow errors with empty catch blocks.
- Validate all external input with Zod.
- Return errors in the standard format:

```json
{ "error": { "code": "NOT_FOUND", "message": "Resource not found" } }
```

### Logging

- Use the structured JSON logger (pino) in production. Never use `console.log`.
- Log at the appropriate level: `debug` for development diagnostics, `info` for operational events, `warn` for recoverable issues, `error` for failures.

### Imports

- Use `@organizrx/shared` for shared logic, types, and schemas.
- Use `@organizrx/plugin-sdk` for plugin contracts.
- Use relative paths within the same app or package.

## PR Checklist

Every pull request must satisfy this checklist before merging:

### Code Quality

- [ ] TypeScript strict mode passes (`bun run check`)
- [ ] No `as any`, `@ts-ignore`, or `console.log`
- [ ] No raw SQL strings -- all queries use Drizzle ORM
- [ ] Files do not exceed 300 lines (split if larger)
- [ ] All external input validated with Zod

### Testing

- [ ] Tests pass (`bun test`)
- [ ] New endpoints have corresponding test files (`*.spec.ts`)
- [ ] External dependencies are mocked in unit tests

### Security

- [ ] No hardcoded secrets or credentials
- [ ] New endpoints have appropriate auth middleware
- [ ] Group-based authorization enforced where needed
- [ ] SSRF protections maintained for any URL-accepting endpoints

### Database

- [ ] Schema changes include generated migration files
- [ ] Column names use `snake_case`
- [ ] Schema works across all three dialects (SQLite, MySQL, PostgreSQL)

### Git

- [ ] Conventional commit messages (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `security:`)
- [ ] Branch named `feature/description` or `fix/description`
- [ ] Atomic commits (small, focused changes)

### Documentation

- [ ] New endpoints documented in the API reference
- [ ] New tables documented in the database reference
- [ ] Complex logic has inline comments explaining the "why"

## Architecture Rules

These rules are enforced during code review:

1. **No jQuery or direct DOM manipulation**: Use React for all UI updates.
2. **No PHP patterns**: Avoid god-classes, traits-as-modules, or config arrays.
3. **No unmanaged iframes**: All `<iframe>` elements must have `sandbox` attributes.
4. **No package downgrades**: Always target the latest stable versions.
5. **No raw SQL**: Use Drizzle query builder exclusively.
6. **CORS**: Use an explicit origin whitelist. Never use `*` in production.
7. **JWT**: Support RS256 or HS256 only. Algorithm `none` is forbidden.
8. **Passwords**: Bcrypt with minimum 12 rounds.
9. **Rate limiting**: All authentication endpoints must be rate-limited.

## Shared Package Development

When adding shared types or schemas to `@organizrx/shared`:

1. Add the type/schema to `packages/shared/src/`.
2. Export it from `packages/shared/src/index.ts`.
3. Import via `@organizrx/shared` in both server and web code.
4. Ensure the shared code has no runtime dependencies on either app.

```typescript
// packages/shared/src/schemas/user.ts
import { z } from 'zod'

export const createUserSchema = z.object({
  username: z.string().min(1).max(255),
  password: z.string().min(8),
  email: z.string().email(),
  groupId: z.number().int().min(0),
})

export type CreateUserRequest = z.infer<typeof createUserSchema>
```

This schema can then be used by both the server (for request validation) and the frontend (for form validation).
