import { cn } from '../../../utils'
import type { WizardData } from '../use-wizard'

interface SettingsStepProps {
  data: WizardData
  errors: Partial<Record<keyof WizardData, string>>
  update: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void
}

export function SettingsStep({ data, errors, update }: SettingsStepProps) {
  const inputClass = (key: keyof WizardData) =>
    cn(
      'w-full bg-muted/50 border rounded-md px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all',
      errors[key] ? 'border-destructive' : 'border-border'
    )

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Basic Settings</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Configure basic application settings. These can be changed later in the Settings page.
      </p>
      <div>
        <label htmlFor="wiz-title" className="block text-sm font-medium text-muted-foreground mb-1">
          Site Title
        </label>
        <input
          id="wiz-title"
          type="text"
          className={inputClass('siteTitle')}
          placeholder="OrganizrX"
          value={data.siteTitle}
          onChange={(e) => update('siteTitle', e.target.value)}
        />
        {errors.siteTitle && <p className="mt-1 text-xs text-destructive">{errors.siteTitle}</p>}
      </div>
    </div>
  )
}
