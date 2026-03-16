import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'path'

const repoRoot = process.cwd()
const authFile = resolve(repoRoot, 'e2e/.auth/admin.json')

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  reporter: 'html',
  timeout: 30_000,
  workers: 1,
  globalSetup: resolve(repoRoot, 'e2e/setup/global-setup.ts'),
  globalTeardown: resolve(repoRoot, 'e2e/setup/global-teardown.ts'),
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'auth-setup',
      testMatch: /setup\/auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'chromium',
      dependencies: ['auth-setup'],
      testIgnore: /setup\/auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
    },
  ],
  webServer: [
    {
      command:
        'sh -c "while [ ! -f /tmp/e2e-organizrx.ready ]; do sleep 1; done; DATABASE_URL=/tmp/e2e-organizrx.db DATABASE_DIALECT=sqlite JWT_SECRET=test-jwt-secret-for-e2e-testing-32c bun run apps/server/src/index.ts"',
      cwd: repoRoot,
      timeout: 120_000,
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: false,
    },
    {
      command: 'bun run --cwd apps/web preview --port 5173 --host 0.0.0.0',
      cwd: repoRoot,
      timeout: 120_000,
      url: 'http://localhost:5173',
      reuseExistingServer: false,
    },
  ],
})
