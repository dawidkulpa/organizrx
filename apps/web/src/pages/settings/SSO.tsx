import { z } from 'zod'
import { SettingsForm } from '../../components/SettingsForm'

const INPUT_CLASS = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
const CHECKBOX_CLASS = "h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"

const ssoSchema = z.object({
  ssoEnabled: z.boolean(),
  cookieDomain: z.string().optional(),
  cookieName: z.string().min(1, 'Required'),
  cookieExpire: z.coerce.number().min(1, 'Minimum 1 hour'),
  plexSsoEnabled: z.boolean(),
  oidcSsoEnabled: z.boolean(),
})

export default function SSOSettings() {
  return (
    <SettingsForm
      schema={ssoSchema}
      settingsKey="sso"
      title="Single Sign-On (SSO)"
      description="Configure authentication sharing across subdomains."
    >
      {(form) => (
        <div className="space-y-6">
          <div className="flex items-center space-x-2 rounded-md border p-4 bg-muted/20">
            <input
              id="ssoEnabled"
              type="checkbox"
              {...form.register('ssoEnabled')}
              className={CHECKBOX_CLASS}
            />
            <div className="flex-1 space-y-1">
              <label htmlFor="ssoEnabled" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Enable SSO
              </label>
              <p className="text-[0.8rem] text-muted-foreground">
                Allow users to sign in once and access all services.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="cookieName" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Cookie Name
              </label>
              <input
                id="cookieName"
                {...form.register('cookieName')}
                className={INPUT_CLASS}
                placeholder="organizr_token"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="cookieDomain" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Cookie Domain
              </label>
              <input
                id="cookieDomain"
                {...form.register('cookieDomain')}
                className={INPUT_CLASS}
                placeholder=".example.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="cookieExpire" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Expiration (Hours)
              </label>
              <input
                id="cookieExpire"
                type="number"
                {...form.register('cookieExpire')}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-medium">SSO Providers</h3>
            
            <div className="flex items-center space-x-2">
              <input
                id="plexSsoEnabled"
                type="checkbox"
                {...form.register('plexSsoEnabled')}
                className={CHECKBOX_CLASS}
              />
              <label htmlFor="plexSsoEnabled" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Enable Plex SSO
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="oidcSsoEnabled"
                type="checkbox"
                {...form.register('oidcSsoEnabled')}
                className={CHECKBOX_CLASS}
              />
              <label htmlFor="oidcSsoEnabled" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Enable OIDC (OpenID Connect)
              </label>
            </div>
          </div>
        </div>
      )}
    </SettingsForm>
  )
}
