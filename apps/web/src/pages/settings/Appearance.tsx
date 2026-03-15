import { z } from 'zod'
import { SettingsForm } from '../../components/SettingsForm'

const INPUT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
const CHECKBOX_CLASS = 'h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'
const TEXTAREA_CLASS =
  'flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

const appearanceSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']),
  accentColor: z.string().min(1, 'Required'),
  customCss: z.string().optional(),
  compactMode: z.boolean(),
})

export default function AppearanceSettings() {
  return (
    <SettingsForm
      schema={appearanceSchema}
      settingsKey="appearance"
      title="Appearance"
      description="Customize the look and feel of OrganizrX."
    >
      {(form) => (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label
                htmlFor="theme"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Theme
              </label>
              <select id="theme" {...form.register('theme')} className={INPUT_CLASS}>
                <option value="system">System Default</option>
                <option value="dark">Dark Mode</option>
                <option value="light">Light Mode</option>
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="accentColor"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Accent Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="accentColor"
                  type="color"
                  value={form.watch('accentColor') || '#4caf50'}
                  onChange={(e) =>
                    form.setValue('accentColor', e.target.value, { shouldDirty: true })
                  }
                  className="h-9 w-16 p-1 rounded-md border border-input bg-background cursor-pointer"
                />
                <input type="text" {...form.register('accentColor')} className={INPUT_CLASS} />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 rounded-md border p-4">
            <input
              id="compactMode"
              type="checkbox"
              {...form.register('compactMode')}
              className={CHECKBOX_CLASS}
            />
            <div className="flex-1 space-y-1">
              <label
                htmlFor="compactMode"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Compact Mode
              </label>
              <p className="text-[0.8rem] text-muted-foreground">
                Reduce spacing and font sizes for higher information density.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="customCss"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Custom CSS
            </label>
            <p className="text-[0.8rem] text-muted-foreground">Add your own CSS overrides here.</p>
            <textarea
              id="customCss"
              {...form.register('customCss')}
              className={TEXTAREA_CLASS}
              rows={8}
              placeholder="/* .your-class { color: red; } */"
            />
          </div>
        </div>
      )}
    </SettingsForm>
  )
}
