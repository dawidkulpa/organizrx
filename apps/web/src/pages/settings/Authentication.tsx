import { z } from 'zod'
import { SettingsForm } from '../../components/SettingsForm'

const INPUT_CLASS = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"

const authSchema = z.object({
  authMethod: z.enum(['local', 'ldap', 'both']),
  sessionTimeout: z.coerce.number().min(1, 'Must be at least 1 minute'),
  maxLoginAttempts: z.coerce.number().min(1, 'Must be at least 1 attempt'),
  lockoutDuration: z.coerce.number().min(1, 'Must be at least 1 minute'),
  enforce2fa: z.enum(['disabled', 'optional', 'required']),
})

export default function AuthenticationSettings() {
  return (
    <SettingsForm
      schema={authSchema}
      settingsKey="authentication"
      title="Authentication"
      description="Manage how users log in and security policies."
    >
      {(form) => (
        <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="authMethod" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Authentication Method
            </label>
            <p className="text-[0.8rem] text-muted-foreground">
              Choose the primary authentication source.
            </p>
            <select
              id="authMethod"
              {...form.register('authMethod')}
              className={INPUT_CLASS}
            >
              <option value="local">Local Database Only</option>
              <option value="ldap">LDAP / Active Directory Only</option>
              <option value="both">Both (Local + LDAP)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="sessionTimeout" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Session Timeout (Minutes)
              </label>
              <p className="text-[0.8rem] text-muted-foreground">
                Logout after inactivity.
              </p>
              <input
                id="sessionTimeout"
                type="number"
                {...form.register('sessionTimeout')}
                className={INPUT_CLASS}
              />
              {form.formState.errors.sessionTimeout && (
                <p className="text-[0.8rem] font-medium text-destructive">
                  {form.formState.errors.sessionTimeout.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="maxLoginAttempts" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Max Login Attempts
              </label>
              <p className="text-[0.8rem] text-muted-foreground">
                Before temporary lockout.
              </p>
              <input
                id="maxLoginAttempts"
                type="number"
                {...form.register('maxLoginAttempts')}
                className={INPUT_CLASS}
              />
              {form.formState.errors.maxLoginAttempts && (
                <p className="text-[0.8rem] font-medium text-destructive">
                  {form.formState.errors.maxLoginAttempts.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="lockoutDuration" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Lockout Duration (Minutes)
            </label>
            <p className="text-[0.8rem] text-muted-foreground">
              How long to block IPs after failed attempts.
            </p>
            <input
              id="lockoutDuration"
              type="number"
              {...form.register('lockoutDuration')}
              className={INPUT_CLASS}
            />
            {form.formState.errors.lockoutDuration && (
              <p className="text-[0.8rem] font-medium text-destructive">
                {form.formState.errors.lockoutDuration.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="enforce2fa" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Two-Factor Authentication (2FA)
            </label>
            <p className="text-[0.8rem] text-muted-foreground">
              Require users to set up 2FA.
            </p>
            <select
              id="enforce2fa"
              {...form.register('enforce2fa')}
              className={INPUT_CLASS}
            >
              <option value="disabled">Disabled (User Choice)</option>
              <option value="optional">Optional (Recommended)</option>
              <option value="required">Required (Enforced)</option>
            </select>
          </div>
        </div>
      )}
    </SettingsForm>
  )
}
