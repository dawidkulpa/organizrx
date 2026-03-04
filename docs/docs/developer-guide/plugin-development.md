---
sidebar_position: 3
---

# Plugin Development

This guide covers everything you need to build a plugin for OrganizrX, from the SDK interfaces to registration, routing, widgets, and testing.

## Overview

OrganizrX plugins are self-contained packages that extend the dashboard with new functionality. Each plugin:

- Implements the `OrganizrPlugin` interface from `@organizrx/plugin-sdk`
- Declares a `PluginManifest` with metadata
- Receives a `PluginAPI` object at initialization for settings, logging, and HTTP access
- Can register Hono API routes and homepage widget definitions

## SDK Interfaces

The plugin SDK is located in `packages/plugin-sdk/src/index.ts`. All interfaces below are exported from `@organizrx/plugin-sdk`.

### PluginManifest

Every plugin must export a manifest describing itself:

```typescript
interface PluginManifest {
  name: string // Unique identifier (kebab-case, e.g. 'plex')
  displayName: string // Human-readable name (e.g. 'Plex Media Server')
  description: string // Short description of what the plugin does
  version: string // Semver version (e.g. '1.0.0')
  author: string // Author name or organization
  category: string // Grouping category (e.g. 'media', 'download', 'monitoring')
  icon?: string // Optional icon identifier
  homepage?: string // Optional link to project homepage
  requiresUrl: boolean // Whether the plugin needs a service URL to function
}
```

### OrganizrPlugin

The main interface every plugin must implement:

```typescript
interface OrganizrPlugin {
  manifest: PluginManifest

  // Called once when the plugin is loaded. Receives the PluginAPI.
  init(api: PluginAPI): Promise<void> | void

  // Optional: return Hono routes to mount under /api/plugins/:name/
  getRoutes?(): Hono

  // Optional: return widget definitions for the homepage dashboard
  getWidgets?(): WidgetDefinition[]

  // Optional: called when the plugin is unloaded
  destroy?(): Promise<void> | void
}
```

### PluginAPI

The API surface provided to every plugin at initialization:

```typescript
interface PluginAPI {
  settings: PluginSettings
  logger: PluginLogger
  http: PluginHTTP
}
```

### PluginSettings

Key-value storage scoped to the plugin:

```typescript
interface PluginSettings {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  getAll(): Promise<Record<string, string>>
  delete(key: string): Promise<void>
}
```

Settings are stored in the `options` table with a plugin-specific prefix. Each plugin can only access its own settings.

### PluginLogger

Structured logging with the plugin name as context:

```typescript
interface PluginLogger {
  info(message: string, data?: Record<string, unknown>): void
  warn(message: string, data?: Record<string, unknown>): void
  error(message: string, data?: Record<string, unknown>): void
  debug(message: string, data?: Record<string, unknown>): void
}
```

Log output is structured JSON via pino, with the plugin name automatically included in every log entry.

### PluginHTTP

An HTTP client for calling external service APIs:

```typescript
interface PluginHTTP {
  get(url: string, options?: RequestOptions): Promise<Response>
  post(url: string, body?: unknown, options?: RequestOptions): Promise<Response>
  put(url: string, body?: unknown, options?: RequestOptions): Promise<Response>
  delete(url: string, options?: RequestOptions): Promise<Response>
}
```

The HTTP client includes SSRF protection that blocks cloud metadata endpoints and non-HTTP schemes while allowing private IPs (appropriate for home-lab environments).

### WidgetDefinition

Defines a widget that appears on the homepage dashboard:

```typescript
interface WidgetDefinition {
  id: string // Unique widget identifier within the plugin
  name: string // Display name for the widget
  description: string // What the widget shows
  defaultSize: 'small' | 'medium' | 'large'
  refreshInterval?: number // Auto-refresh interval in milliseconds
}
```

## Creating a Plugin

### Step 1: Scaffold the Package

Create a new directory under `plugins/packages/`:

```text
plugins/packages/my-plugin/
├── src/
│   └── index.ts
├── package.json
└── tsconfig.json
```

**`package.json`:**

```json
{
  "name": "@organizrx/plugin-my-plugin",
  "version": "1.0.0",
  "private": true,
  "main": "src/index.ts",
  "dependencies": {
    "@organizrx/plugin-sdk": "workspace:*"
  }
}
```

### Step 2: Implement the Plugin

```typescript
// plugins/packages/my-plugin/src/index.ts
import { Hono } from 'hono'
import type {
  OrganizrPlugin,
  PluginManifest,
  PluginAPI,
  WidgetDefinition,
} from '@organizrx/plugin-sdk'

const manifest: PluginManifest = {
  name: 'my-plugin',
  displayName: 'My Plugin',
  description: 'A custom OrganizrX plugin',
  version: '1.0.0',
  author: 'Your Name',
  category: 'utility',
  requiresUrl: true,
}

let api: PluginAPI

const plugin: OrganizrPlugin = {
  manifest,

  async init(pluginApi: PluginAPI) {
    api = pluginApi
    api.logger.info('My Plugin initialized')

    // Load saved settings
    const serviceUrl = await api.settings.get('serviceUrl')
    if (serviceUrl) {
      api.logger.info('Service URL configured', { url: serviceUrl })
    }
  },

  getRoutes() {
    const routes = new Hono()

    // GET /api/plugins/my-plugin/status
    routes.get('/status', async (c) => {
      const serviceUrl = await api.settings.get('serviceUrl')
      if (!serviceUrl) {
        return c.json({ error: { code: 'NOT_CONFIGURED', message: 'Service URL not set' } }, 400)
      }

      const response = await api.http.get(`${serviceUrl}/api/status`)
      const data = await response.json()
      return c.json({ data })
    })

    return routes
  },

  getWidgets(): WidgetDefinition[] {
    return [
      {
        id: 'my-plugin-status',
        name: 'My Plugin Status',
        description: 'Shows the current status of the connected service',
        defaultSize: 'small',
        refreshInterval: 30000,
      },
    ]
  },

  async destroy() {
    api.logger.info('My Plugin destroyed')
  },
}

export default plugin
```

### Step 3: Register the Plugin

Add your plugin to the workspace by running `bun install` from the repository root. The plugin manager scans `plugins/packages/` for available plugins.

### Step 4: Configure via the UI

1. Navigate to **Settings > Plugins** in the OrganizrX dashboard.
2. Find your plugin in the available plugins list.
3. Click **Install** to activate it.
4. Configure the service URL and any other settings.

## Plugin Routes

Routes returned by `getRoutes()` are automatically mounted under `/api/plugins/:name/`. For example, if your plugin's manifest name is `my-plugin` and you define a route `GET /status`, it becomes accessible at:

```
GET /api/plugins/my-plugin/status
```

All plugin routes are protected by the same auth middleware as core routes. The user must have a valid JWT to access plugin endpoints.

## Plugin Management API

The core system exposes these endpoints for managing plugins:

| Method | Path                        | Auth  | Description                  |
| ------ | --------------------------- | ----- | ---------------------------- |
| GET    | `/api/plugins`              | Admin | List installed plugins       |
| GET    | `/api/plugins/available`    | Admin | List available (uninstalled) |
| POST   | `/api/plugins/install`      | Admin | Install a plugin by name     |
| DELETE | `/api/plugins/:name`        | Admin | Uninstall a plugin           |
| POST   | `/api/plugins/:name/update` | Admin | Update a plugin              |
| GET    | `/api/plugins/:name/config` | Admin | Get plugin configuration     |
| PUT    | `/api/plugins/:name/config` | Admin | Update plugin configuration  |

## Widget Integration

Widgets defined by `getWidgets()` are displayed on the homepage dashboard. Each widget is rendered in a card with:

- The widget `name` as the card title
- Auto-refresh behavior based on `refreshInterval`
- Size determined by `defaultSize` (`small` = 1/4 width, `medium` = 1/2 width, `large` = full width)

Widget data is fetched from the plugin's routes. The frontend calls the plugin's API endpoints and renders the response in the widget card.

## Existing Plugin Examples

OrganizrX ships with 10 active plugins that serve as reference implementations:

| Plugin      | Category   | Key Features                      |
| ----------- | ---------- | --------------------------------- |
| Plex        | media      | Now playing, library stats        |
| Sonarr      | media      | Series calendar, queue monitoring |
| Radarr      | media      | Movie calendar, queue monitoring  |
| SABnzbd     | download   | Download queue, speed, history    |
| Overseerr   | media      | Request management, trending      |
| Tautulli    | monitoring | Stream monitoring, user stats     |
| Jellyfin    | media      | Now playing, library stats        |
| qBittorrent | download   | Torrent queue, speed monitoring   |
| Emby        | media      | Now playing, library stats        |
| NZBGet      | download   | Download queue, history           |

Browse the source code under `plugins/packages/` for each of these to see real-world implementations.

## Testing Plugins

Co-locate test files with your plugin source using the `*.spec.ts` suffix:

```text
plugins/packages/my-plugin/
├── src/
│   ├── index.ts
│   └── index.spec.ts
```

Use `bun test` from the repository root to execute tests. Mock the `PluginAPI` in your tests:

```typescript
// plugins/packages/my-plugin/src/index.spec.ts
import { describe, it, expect, mock } from 'bun:test'
import plugin from './index'
import type { PluginAPI } from '@organizrx/plugin-sdk'

const mockApi: PluginAPI = {
  settings: {
    get: mock(() => Promise.resolve(null)),
    set: mock(() => Promise.resolve()),
    getAll: mock(() => Promise.resolve({})),
    delete: mock(() => Promise.resolve()),
  },
  logger: {
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    debug: mock(() => {}),
  },
  http: {
    get: mock(() => Promise.resolve(new Response('{}'))),
    post: mock(() => Promise.resolve(new Response('{}'))),
    put: mock(() => Promise.resolve(new Response('{}'))),
    delete: mock(() => Promise.resolve(new Response('{}'))),
  },
}

describe('my-plugin', () => {
  it('should have correct manifest', () => {
    expect(plugin.manifest.name).toBe('my-plugin')
    expect(plugin.manifest.requiresUrl).toBe(true)
  })

  it('should initialize without error', async () => {
    await plugin.init(mockApi)
    expect(mockApi.logger.info).toHaveBeenCalledWith('My Plugin initialized')
  })

  it('should return routes', () => {
    const routes = plugin.getRoutes?.()
    expect(routes).toBeDefined()
  })

  it('should return widgets', () => {
    const widgets = plugin.getWidgets?.()
    expect(widgets).toHaveLength(1)
    expect(widgets?.[0].id).toBe('my-plugin-status')
  })
})
```

## Best Practices

- **Keep plugins focused**: Each plugin should integrate with a single external service.
- **Use settings for configuration**: Store all user-configurable values via `PluginSettings` rather than environment variables.
- **Handle errors gracefully**: Return proper error responses with `{ error: { code, message } }` format. Never let unhandled exceptions crash the server.
- **Log meaningfully**: Use `api.logger` for diagnostic information. Avoid excessive debug logging in production.
- **Validate external responses**: External APIs may return unexpected data. Validate responses with Zod before using them.
- **Respect SSRF protections**: The `PluginHTTP` client blocks dangerous URLs. Do not attempt to bypass these protections.
