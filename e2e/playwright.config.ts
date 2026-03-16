import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  workers: 1,
  reporter: 'html',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /setup\/auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      command:
        'DATABASE_URL=/tmp/e2e-organizrx.db DATABASE_DIALECT=sqlite JWT_SECRET=test-jwt-secret-for-e2e-testing-32c bun run apps/server/src/index.ts',
      port: 3001,
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: 'bun run --cwd apps/web preview --port 5173',
      port: 5173,
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
  globalSetup: './setup/global-setup.ts',
  globalTeardown: './setup/global-teardown.ts',
})
