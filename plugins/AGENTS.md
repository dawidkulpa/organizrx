# Plugin Conventions

## Plugin Architecture
- **SDK:** Every plugin must export `OrganizrPlugin` from the `@organizrx/plugin-sdk` package.
- **Structure:**
  - `src/index.ts`: Main entry point for the plugin export.
  - `src/widget.tsx`: React dashboard widget for the plugin.
  - `src/api.ts`: Hono sub-app for the plugin's backend routes.
  - `package.json`: Naming convention `@organizrx/plugin-{name}`.

## Plugin Lifecycle
Plugins follow a strict discovery and execution flow:
`Discovery → Registration → Initialization → Route Mounting → Widget Mounting → Teardown`.

## Backend Routes & Widgets
- **API Routes:** Every plugin has its Hono sub-app mounted at `/api/plugins/{name}/*`.
- **Dashboard Widgets:** React components that receive `WidgetProps` and are rendered within the dashboard's responsive grid.

## Configuration & Storage
- **Schema:** All plugins must declare their configuration schema using Zod.
- **Access:** Configuration is managed via the plugin API and stored in the database within a plugin-specific namespace.
- **Data Access:** All database interaction must be scoped and performed through the provided plugin API.

## Testing & Publishing
- **Unit Testing:** Use `bun test` and mock the plugin API to test logic in isolation.
- **Versioning:** Follow semantic versioning for all plugin releases.
- **Namespace:** All official plugins must be published under the `@organizrx` npm scope.

## Prohibited Patterns (Do Not)
- No direct database access: Use only the scoped plugin API.
- No global state mutation: Plugins must be isolated.
- Restricted Routes: Do not define routes outside the `/api/plugins/{name}/*` path.
- No external dependencies: Avoid adding large libraries to individual plugins.
- No raw SQL.
