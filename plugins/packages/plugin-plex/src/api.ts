import { Hono } from 'hono'
import type { PluginAPI } from '@organizrx/plugin-sdk'
import { registerRoutes } from './routes'

export function createPlexAPI(api: PluginAPI) {
  const app = new Hono()
  registerRoutes(app, api)
  return app
}
