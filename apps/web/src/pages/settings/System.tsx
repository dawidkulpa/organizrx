import { z } from 'zod'
import { SettingsForm } from '../../components/SettingsForm'

const INPUT_CLASS = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
const CHECKBOX_CLASS = "h-4 w-4 rounded border-input text-primary focus:ring-primary"

const systemSchema = z.object({
  logLevel: z.enum(['debug', 'info', 'warn', 'error']),
  rateLimitEnabled: z.boolean(),
  rateLimitRequests: z.coerce.number().min(1, 'At least 1 request'),
  rateLimitWindow: z.coerce.number().min(1, 'At least 1 second'),
  backupAuto: z.boolean(),
  backupInterval: z.coerce.number().min(1, 'At least 1 hour'),
})

export default function SystemSettings() {
  return (
    <SettingsForm
      schema={systemSchema}
      settingsKey="system"
      title="System Configuration"
      description="Manage server-side behavior and maintenance."
    >
      {(form) => (
        <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="logLevel" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Log Level
            </label>
            <p className="text-[0.8rem] text-muted-foreground">
              Verbosity of server logs.
            </p>
            <select
              id="logLevel"
              {...form.register('logLevel')}
              className={INPUT_CLASS}
            >
              <option value="debug">Debug (Verbose)</option>
              <option value="info">Info (Standard)</option>
              <option value="warn">Warning (Issues only)</option>
              <option value="error">Error (Critical only)</option>
            </select>
          </div>

          <div className="space-y-4 rounded-md border p-4">
            <h3 className="text-sm font-medium">API Rate Limiting</h3>
            <div className="flex items-center space-x-2">
              <input
                id="rateLimitEnabled"
                type="checkbox"
                {...form.register('rateLimitEnabled')}
                className={CHECKBOX_CLASS}
              />
              <label htmlFor="rateLimitEnabled" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Enable Rate Limiting
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="rateLimitRequests" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Max Requests
                </label>
                <input
                  id="rateLimitRequests"
                  type="number"
                  {...form.register('rateLimitRequests')}
                  disabled={!form.watch('rateLimitEnabled')}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="rateLimitWindow" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Window (Seconds)
                </label>
                <input
                  id="rateLimitWindow"
                  type="number"
                  {...form.register('rateLimitWindow')}
                  disabled={!form.watch('rateLimitEnabled')}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-md border p-4">
            <h3 className="text-sm font-medium">Automatic Backups</h3>
            <div className="flex items-center space-x-2">
              <input
                id="backupAuto"
                type="checkbox"
                {...form.register('backupAuto')}
                className={CHECKBOX_CLASS}
              />
              <label htmlFor="backupAuto" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Enable Scheduled Backups
              </label>
            </div>

            <div className="space-y-2">
              <label htmlFor="backupInterval" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Interval (Hours)
              </label>
              <input
                id="backupInterval"
                type="number"
                {...form.register('backupInterval')}
                disabled={!form.watch('backupAuto')}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        </div>
      )}
    </SettingsForm>
  )
}
