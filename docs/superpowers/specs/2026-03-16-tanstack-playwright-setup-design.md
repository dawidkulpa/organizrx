# Spec: TanStack Query v5 Migration & Playwright E2E Setup

**Status:** Draft
**Date:** 2026-03-16
**Author:** The Librarian (OpenCode)

## 1. Overview

This specification outlines the modernization of the **OrganizrX** monorepo by migrating data fetching to **TanStack Query v5** and implementing a robust **Playwright E2E** testing suite.

## 2. TanStack Query v5 Migration

### 2.1 API Client (Hono RPC)
We will leverage Hono's RPC client (`hc`) for full type safety.
- **File:** `apps/web/src/api/hc.ts`
- **Implementation:** 
  - Wrap `hc` to inject the JWT token from `useAuthStore` in the request headers.
  - Handle base URL configuration via environment variables.

### 2.2 Query Key Management
- **File:** `apps/web/src/api/query-keys.ts`
- **Pattern:** Nested object factory.
  ```typescript
  export const queryKeys = {
    tabs: {
      all: ['tabs'] as const,
      detail: (id: number) => ['tabs', 'detail', id] as const,
    },
    // ...
  }
  ```

### 2.3 Feature-Based Hooks
- Custom hooks will be co-located with features (e.g., `apps/web/src/features/tabs/hooks/use-tabs.ts`).
- **Options:** Default `staleTime: 30000` (30s) and `gcTime: 300000` (5min).

### 2.4 State Separation
- **Zustand:** Remains for client state (Auth status, Sidebar toggle, Theme).
- **TanStack Query:** Handles ALL server state. No syncing RQ data into Zustand.

---

## 3. Playwright E2E Setup

### 3.1 Monorepo Configuration
- **Location:** `tests/e2e/` at the root level.
- **Config:** `playwright.config.ts` in the root.
- **WebServer:** Starts both `apps/server` (port 3001) and `apps/web` (port 5173).

### 3.2 Database Isolation
- **Strategy:** Temp DB per worker.
- **Fixture:** `test.beforeEach` fixture copies `apps/server/prisma/template.db` (seeded SQLite) to `apps/server/data/test-${workerIndex}.db`.
- **Server Communication:** The server reads `DATABASE_URL` or `SQLITE_PATH` from environment variables passed by Playwright.

### 3.3 Authentication Flow
- **Setup Project:** Dedicated `setup` project logs in and saves `storageState` to `.auth/user.json`.
- **First-Run Project:** Independent project (no `storageState`) that tests the `/wizard` setup flow from an empty state.

### 3.4 Page Object Model (POM)
- Page objects stored in `tests/e2e/pages/`.
- Custom fixtures in `tests/e2e/fixtures.ts` to provide pages to tests.

---

## 4. Success Criteria
1. No `useEffect` + `fetch` calls remaining in components.
2. Full type safety from Hono route to React Query hook.
3. Parallel E2E test execution passing locally and in CI.
4. Setup wizard fully tested without manually resetting the database.
