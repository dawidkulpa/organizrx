# Design: Playwright E2E Testing for OrganizrX (Bun Monorepo)

## Purpose
Establish a robust, scalable end-to-end (E2E) testing framework for the OrganizrX monorepo to ensure quality across the Hono backend and React frontend.

## Architecture

### 1. Monorepo Structure
The E2E suite resides in a root-level `e2e/` directory to facilitate testing cross-cutting concerns between the backend and frontend.

```text
organizrx/
├── e2e/
│   ├── tests/              # Feature-based spec files
│   ├── poms/               # Page Object Models
│   ├── .auth/              # (Git-ignored) Persisted session storage
│   ├── setup/              # Global setup (DB migrations, seed data)
│   ├── playwright.config.ts
│   └── package.json        # Test-only dependencies
├── apps/
│   ├── server/             # Hono Backend
│   └── web/                # React Frontend
```

### 2. Runtime Strategy (Node.js + Bun)
*   **Test Runner**: Node.js (`npx playwright test`). This provides the most stable execution for Playwright in 2026, avoiding known Bun/Playwright integration issues like segfaults and timeouts.
*   **Application Runtime**: Bun (`bun run dev`). The backend and frontend continue to run on Bun for performance and consistency with the development environment.

## Key Features

### WebServer Configuration
Playwright orchestrates the startup of both servers using the `webServer` config option:

```typescript
// e2e/playwright.config.ts
export default defineConfig({
  webServer: [
    {
      command: 'bun run --cwd ../apps/server dev',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_DIALECT: 'sqlite',
        DATABASE_URL: './e2e/temp.db',
        NODE_ENV: 'test',
      },
    },
    {
      command: 'bun run --cwd ../apps/web dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
  use: { baseURL: 'http://localhost:5173' },
});
```

### Database Isolation
*   **Strategy**: Ephemeral SQLite database file (`./e2e/temp.db`).
*   **Initialization**: A `globalSetup` script runs `bunx drizzle-kit push` (or migrate) and seeds a default admin user.
*   **Cleanup**: `globalTeardown` removes the temporary file to ensure no state persistence between test runs.

### Authentication Handling
*   **Pattern**: Playwright `storageState`.
*   **Mechanism**: A special "setup" project in Playwright runs first, logs in via the UI/API, and saves the browser context (cookies/localstorage) to `e2e/.auth/user.json`. All subsequent tests load this state to skip login overhead.

## Test Organization
Tests are organized by feature flow rather than per page:
1. `auth.spec.ts`: Login, registration, 2FA, password reset.
2. `wizard.spec.ts`: Initial setup flow and database migration.
3. `tabs.spec.ts`: Tab creation, ordering, and iframe rendering.
4. `plugins.spec.ts`: Plugin installation, widget placement, and API interaction.

## CI/CD Integration (GitHub Actions)
```yaml
- name: Install Playwright Browsers
  run: npx playwright install --with-deps
- name: Run Playwright tests
  run: npx playwright test
```

## Success Criteria
- [ ] Tests run reliably in both local and CI environments.
- [ ] Authentication is handled once per suite run.
- [ ] Each test run starts with a clean, isolated SQLite database.
- [ ] No regression in application code performance or structure.
