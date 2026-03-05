import { cn } from '../../../utils'
import type { WizardData } from '../use-wizard'

interface AdminStepProps {
  data: WizardData
  errors: Partial<Record<keyof WizardData, string>>
  update: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void
}

export function AdminStep({ data, errors, update }: AdminStepProps) {
  const inputClass = (key: keyof WizardData) =>
    cn(
      'w-full bg-muted/50 border rounded-md px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all',
      errors[key] ? 'border-destructive' : 'border-border'
    )

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Create Admin Account</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Create the administrator account that will have full access to OrganizrX.
      </p>
      <div className="space-y-3">
        <div>
          <label
            htmlFor="wiz-username"
            className="block text-sm font-medium text-muted-foreground mb-1"
          >
            Username <span className="text-destructive">*</span>
          </label>
          <input
            id="wiz-username"
            type="text"
            className={inputClass('username')}
            placeholder="admin"
            value={data.username}
            onChange={(e) => update('username', e.target.value)}
          />
          {errors.username && <p className="mt-1 text-xs text-destructive">{errors.username}</p>}
        </div>
        <div>
          <label
            htmlFor="wiz-email"
            className="block text-sm font-medium text-muted-foreground mb-1"
          >
            Email (optional)
          </label>
          <input
            id="wiz-email"
            type="email"
            className={inputClass('email')}
            placeholder="admin@example.com"
            value={data.email}
            onChange={(e) => update('email', e.target.value)}
          />
          {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
        </div>
        <div>
          <label
            htmlFor="wiz-password"
            className="block text-sm font-medium text-muted-foreground mb-1"
          >
            Password <span className="text-destructive">*</span>
          </label>
          <input
            id="wiz-password"
            type="password"
            className={inputClass('password')}
            placeholder="••••••••"
            value={data.password}
            onChange={(e) => update('password', e.target.value)}
          />
          {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password}</p>}
        </div>
        <div>
          <label
            htmlFor="wiz-confirm"
            className="block text-sm font-medium text-muted-foreground mb-1"
          >
            Confirm Password <span className="text-destructive">*</span>
          </label>
          <input
            id="wiz-confirm"
            type="password"
            className={inputClass('confirmPassword')}
            placeholder="••••••••"
            value={data.confirmPassword}
            onChange={(e) => update('confirmPassword', e.target.value)}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-destructive">{errors.confirmPassword}</p>
          )}
        </div>
      </div>
    </div>
  )
}
