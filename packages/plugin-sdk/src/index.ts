// Plugin SDK for OrganizrX
// Provides interfaces and utilities for plugin development

export interface Plugin {
  name: string
  version: string
  initialize(): Promise<void>
}

export abstract class BasePlugin implements Plugin {
  abstract name: string
  abstract version: string

  abstract initialize(): Promise<void>
}
