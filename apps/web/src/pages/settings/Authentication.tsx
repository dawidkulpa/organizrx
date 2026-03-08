import { SettingsForm } from '../../components/SettingsForm'
import {
  authSchema,
  authenticationSectionClass,
  SectionHeader,
  SelectField,
  TextField,
  ToggleField,
} from './authentication-form-controls'

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
          <section className={authenticationSectionClass}>
            <SectionHeader
              title="Local Authentication"
              description="Manage direct sign-in methods, session policy, and account protection rules."
            />

            <SelectField
              form={form}
              id="authMethod"
              label="Authentication Method"
              help="Choose the primary authentication source."
              options={[
                { value: 'local', label: 'Local Database Only' },
                { value: 'ldap', label: 'LDAP / Active Directory Only' },
                { value: 'both', label: 'Both (Local + LDAP)' },
              ]}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <TextField
                form={form}
                id="sessionTimeout"
                type="number"
                label="Session Timeout (Minutes)"
                help="Logout after inactivity."
              />
              <TextField
                form={form}
                id="maxLoginAttempts"
                type="number"
                label="Max Login Attempts"
                help="Before temporary lockout."
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <TextField
                form={form}
                id="lockoutDuration"
                type="number"
                label="Lockout Duration (Minutes)"
                help="How long to block IPs after failed attempts."
              />
              <SelectField
                form={form}
                id="enforce2fa"
                label="Two-Factor Authentication (2FA)"
                help="Require users to set up 2FA."
                options={[
                  { value: 'disabled', label: 'Disabled (User Choice)' },
                  { value: 'optional', label: 'Optional (Recommended)' },
                  { value: 'required', label: 'Required (Enforced)' },
                ]}
              />
            </div>
          </section>

          <section className={authenticationSectionClass}>
            <SectionHeader
              title="Single Sign-On"
              description="Configure shared authentication cookies for connected services."
            />

            <ToggleField
              form={form}
              id="ssoEnabled"
              label="Enable SSO"
              help="Allow users to sign in once and access all services."
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <TextField
                form={form}
                id="cookieDomain"
                label="SSO Domain"
                help="Domain used for shared authentication cookies."
                placeholder=".example.com"
              />
              <TextField
                form={form}
                id="cookieName"
                label="Cookie Name"
                help="Name used for the shared SSO cookie."
                placeholder="organizr_token"
              />
              <div className="md:col-span-2">
                <TextField
                  form={form}
                  id="cookieExpire"
                  type="number"
                  label="Expiration (Hours)"
                  help="How long the shared cookie remains valid."
                />
              </div>
            </div>
          </section>

          <section className={authenticationSectionClass}>
            <SectionHeader
              title="Plex Authentication"
              description="Control whether Plex participates in the unified authentication flow."
            />

            <ToggleField
              form={form}
              id="plexSsoEnabled"
              label="Enable Plex Authentication"
              help="Share Plex authentication tokens through the SSO configuration above."
            />
          </section>

          <section className={authenticationSectionClass}>
            <SectionHeader
              title="OIDC"
              description="Connect an OpenID Connect provider for external identity-based sign in."
            />

            <ToggleField
              form={form}
              id="oidcSsoEnabled"
              label="Enable OIDC"
              help="Allow an external identity provider to participate in sign in."
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <TextField form={form} id="oidc_client_id" label="OIDC Client ID" />
              <TextField
                form={form}
                id="oidc_client_secret"
                type="password"
                label="OIDC Client Secret"
              />
              <TextField
                form={form}
                id="oidc_provider_url"
                label="OIDC Issuer"
                placeholder="https://auth.example.com/application/o/organizrx/"
              />
              <TextField
                form={form}
                id="oidc_redirect_uri"
                label="OIDC Redirect URI"
                placeholder="https://organizrx.example.com/api/auth/oidc/callback"
              />
            </div>
          </section>
        </div>
      )}
    </SettingsForm>
  )
}
