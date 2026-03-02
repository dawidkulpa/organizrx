// Plugin SDK for OrganizrX
// Provides interfaces and utilities for plugin development

// ---------------------------------------------------------------------------
// Plugin Manifest
// ---------------------------------------------------------------------------

/**
 * Metadata describing a plugin — its identity, version, and capabilities.
 */
export interface PluginManifest {
  /** Display name shown in the UI */
  name: string
  /** Unique identifier (e.g., 'plex', 'sonarr') */
  id: string
  /** SemVer version string */
  version: string
  /** Short description of what the plugin does */
  description: string
  /** Plugin author name */
  author: string
  /** Minimum OrganizrX version required to run this plugin */
  minAppVersion?: string
  /** Permissions the plugin requests (e.g., 'settings:read', 'http:external') */
  permissions?: string[]
  /** Whether the plugin provides homepage/dashboard widgets */
  homepage?: boolean
  /** Whether the plugin exposes user-configurable settings */
  configurable?: boolean
}

// ---------------------------------------------------------------------------
// Plugin Settings
// ---------------------------------------------------------------------------

/**
 * Scoped settings interface for plugin key-value storage.
 * All keys are automatically namespaced to prevent collisions.
 */
export interface PluginSettings {
  /** Get a raw string value, or null if not set */
  get(key: string): Promise<string | null>
  /** Get a numeric value, falling back to defaultValue */
  getNumber(key: string, defaultValue?: number): Promise<number>
  /** Get a boolean value, falling back to defaultValue */
  getBoolean(key: string, defaultValue?: boolean): Promise<boolean>
  /** Get a JSON-parsed value, falling back to defaultValue */
  getJSON<T>(key: string, defaultValue?: T): Promise<T>
  /** Set a string value */
  set(key: string, value: string): Promise<void>
}

// ---------------------------------------------------------------------------
// Plugin Logger
// ---------------------------------------------------------------------------

/**
 * Structured logger scoped to a specific plugin.
 */
export interface PluginLogger {
  info(msg: string, data?: Record<string, unknown>): void
  warn(msg: string, data?: Record<string, unknown>): void
  error(msg: string, data?: Record<string, unknown>): void
  debug(msg: string, data?: Record<string, unknown>): void
}

// ---------------------------------------------------------------------------
// Plugin HTTP
// ---------------------------------------------------------------------------

/**
 * Sandboxed HTTP client with SSRF protection and timeout defaults.
 */
export interface PluginHTTP {
  fetch(url: string, options?: RequestInit): Promise<Response>
}

// ---------------------------------------------------------------------------
// Plugin API
// ---------------------------------------------------------------------------

/**
 * The API surface provided to each plugin instance.
 * Scoped per-plugin — settings, logging, and HTTP are all namespaced.
 */
export interface PluginAPI {
  settings: PluginSettings
  logger: PluginLogger
  http: PluginHTTP
}

// ---------------------------------------------------------------------------
// Widget Definition
// ---------------------------------------------------------------------------

/**
 * Describes a dashboard widget that a plugin provides.
 */
export interface WidgetDefinition {
  /** Unique widget identifier within the plugin */
  id: string
  /** Display name */
  name: string
  /** Default grid size */
  defaultSize: { w: number; h: number }
  /** Minimum allowed grid size */
  minSize?: { w: number; h: number }
  /** Maximum allowed grid size */
  maxSize?: { w: number; h: number }
  /** Short description shown in widget picker */
  description?: string
}

// ---------------------------------------------------------------------------
// OrganizrPlugin — the main plugin contract
// ---------------------------------------------------------------------------

/**
 * The interface every OrganizrX plugin must implement.
 */
export interface OrganizrPlugin {
  /** Plugin metadata */
  manifest: PluginManifest

  /** Called when the plugin is loaded. Use for initialization. */
  onLoad(api: PluginAPI): Promise<void>

  /** Called when the plugin is unloaded. Use for cleanup. */
  onUnload?(): Promise<void>

  /**
   * Return a Hono app (or compatible handler) to mount at
   * `/api/plugins/{plugin.manifest.id}/`.
   * Typed as `unknown` to avoid coupling the SDK to Hono.
   */
  getRoutes?(): unknown

  /** Return widget definitions this plugin provides for the dashboard. */
  getWidgets?(): WidgetDefinition[]
}
