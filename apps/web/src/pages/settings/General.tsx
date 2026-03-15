import { z } from 'zod'
import { SettingsForm } from '../../components/SettingsForm'

const INPUT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

const generalSchema = z.object({
  siteTitle: z.string().min(1, 'Site title is required'),
  baseUrl: z.union([z.literal(''), z.string().url('Must be a valid URL')]),
  defaultPage: z.enum(['dashboard', 'homepage']),
  timezone: z.string().min(1, 'Timezone is required'),
})

export default function GeneralSettings() {
  return (
    <SettingsForm
      schema={generalSchema}
      settingsKey="general"
      title="General Settings"
      description="Configure basic site information and defaults."
    >
      {(form) => (
        <div className="space-y-6">
          {/* Site Title */}
          <div className="space-y-2">
            <label
              htmlFor="siteTitle"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Site Title
            </label>
            <p className="text-[0.8rem] text-muted-foreground">
              The name of your OrganizrX instance.
            </p>
            <input
              id="siteTitle"
              {...form.register('siteTitle')}
              className={INPUT_CLASS}
              placeholder="OrganizrX"
            />
            {form.formState.errors.siteTitle && (
              <p className="text-[0.8rem] font-medium text-destructive">
                {form.formState.errors.siteTitle.message}
              </p>
            )}
          </div>

          {/* Base URL */}
          <div className="space-y-2">
            <label
              htmlFor="baseUrl"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Base URL
            </label>
            <p className="text-[0.8rem] text-muted-foreground">
              The public URL where this site is hosted.
            </p>
            <input
              id="baseUrl"
              {...form.register('baseUrl')}
              className={INPUT_CLASS}
              placeholder="https://organizr.example.com"
            />
            {form.formState.errors.baseUrl && (
              <p className="text-[0.8rem] font-medium text-destructive">
                {form.formState.errors.baseUrl.message}
              </p>
            )}
          </div>

          {/* Default Page */}
          <div className="space-y-2">
            <label
              htmlFor="defaultPage"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Default Page
            </label>
            <p className="text-[0.8rem] text-muted-foreground">
              The page users land on after logging in.
            </p>
            <select id="defaultPage" {...form.register('defaultPage')} className={INPUT_CLASS}>
              <option value="dashboard">Dashboard</option>
              <option value="homepage">Homepage</option>
            </select>
            {form.formState.errors.defaultPage && (
              <p className="text-[0.8rem] font-medium text-destructive">
                {form.formState.errors.defaultPage.message}
              </p>
            )}
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <label
              htmlFor="timezone"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Timezone
            </label>
            <p className="text-[0.8rem] text-muted-foreground">Used for logs and scheduling.</p>
            <select id="timezone" {...form.register('timezone')} className={INPUT_CLASS}>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Asia/Tokyo">Asia/Tokyo</option>
              {/* Add more as needed, or fetch from system */}
            </select>
            {form.formState.errors.timezone && (
              <p className="text-[0.8rem] font-medium text-destructive">
                {form.formState.errors.timezone.message}
              </p>
            )}
          </div>
        </div>
      )}
    </SettingsForm>
  )
}
