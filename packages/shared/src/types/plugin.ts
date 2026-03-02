/// <reference lib="dom" />

/**
 * Plugin API and manifest types
 */

/**
 * Plugin manifest - metadata about a plugin
 */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  entry?: string; // entry point file
  settings?: PluginSetting[];
  widgets?: string[]; // widget identifiers
  permissions?: string[]; // required permissions
  dependencies?: Record<string, string>;
}

/**
 * Plugin setting definition
 */
export interface PluginSetting {
  key: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea';
  label: string;
  description?: string;
  default?: any;
  options?: Array<{ label: string; value: any }>;
  required?: boolean;
  validation?: {
    pattern?: string; // regex pattern
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

/**
 * Plugin configuration - user-provided settings for a plugin instance
 */
export interface PluginConfig {
  pluginId: string;
  enabled: boolean;
  settings: Record<string, any>;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

/**
 * Plugin widget definition and state
 */
export interface PluginWidget {
  id: string;
  pluginId: string;
  name: string;
  description?: string;
  location?: 'dashboard' | 'sidebar' | 'header' | 'custom';
  size?: {
    width?: number | string; // px or percentage
    height?: number | string; // px or percentage
  };
  refreshInterval?: number; // milliseconds
  config?: Record<string, any>;
}

/**
 * Plugin API context - passed to plugin functions
 */
export interface PluginAPI {
  /**
   * Logger instance
   */
  logger: {
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, error?: any): void;
  };

  /**
   * Storage interface
   */
  storage: {
    get<T = any>(key: string): Promise<T | null>;
    set<T = any>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
  };

  /**
   * HTTP client
   */
  http: {
    get<T = any>(url: string, options?: RequestInit): Promise<T>;
    post<T = any>(url: string, data?: any, options?: RequestInit): Promise<T>;
    put<T = any>(url: string, data?: any, options?: RequestInit): Promise<T>;
    delete<T = any>(url: string, options?: RequestInit): Promise<T>;
  };

  /**
   * Event emitter for plugin communication
   */
  events: {
    on(event: string, handler: (data: any) => void): void;
    off(event: string, handler: (data: any) => void): void;
    emit(event: string, data?: any): void;
  };

  /**
   * Configuration access
   */
  config: {
    get(key: string): any;
    set(key: string, value: any): Promise<void>;
  };

  /**
   * Widget operations
   */
  widgets: {
    register(widget: PluginWidget): Promise<void>;
    unregister(widgetId: string): Promise<void>;
    update(widgetId: string, config: Partial<PluginWidget>): Promise<void>;
  };

  /**
   * API request helper
   */
  api: {
    call<T = any>(
      method: string,
      endpoint: string,
      data?: any,
      options?: RequestInit
    ): Promise<T>;
  };
}

/**
 * Plugin hook types
 */
export type PluginHook =
  | 'onEnable'
  | 'onDisable'
  | 'onSettingsChange'
  | 'onUninstall';

/**
 * Plugin entry point interface
 */
export interface PluginEntry {
  /**
   * Initialize plugin
   */
  init(api: PluginAPI, manifest: PluginManifest): Promise<void>;

  /**
   * Handle lifecycle hooks
   */
  hook?(name: PluginHook, ...args: any[]): Promise<void>;

  /**
   * Cleanup on disable/uninstall
   */
  destroy?(): Promise<void>;

  /**
   * Optional render method for widgets
   */
  render?(widgetId: string, container: HTMLElement): Promise<void>;
}

/**
 * Plugin registry entry
 */
export interface PluginRegistryEntry {
  manifest: PluginManifest;
  config: PluginConfig;
  entry?: PluginEntry;
  installedAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}
