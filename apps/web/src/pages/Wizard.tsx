import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../utils'
import { api } from '../api/client'
import { toast } from 'sonner'
import { Check, Loader2, Zap, Database, UserPlus, Settings, CheckCircle2 } from 'lucide-react'

const STEPS = [
  { label: 'Welcome', icon: Zap },
  { label: 'Database', icon: Database },
  { label: 'Admin', icon: UserPlus },
  { label: 'Settings', icon: Settings },
  { label: 'Finish', icon: CheckCircle2 },
] as const

const TOTAL_STEPS = STEPS.length

interface WizardData {
  // Admin
  username: string
  password: string
  confirmPassword: string
  email: string
  // Settings
  siteTitle: string
  // DB (informational)
  dbDialect: 'sqlite' | 'mysql' | 'postgresql'
}

const initialData: WizardData = {
  username: '',
  password: '',
  confirmPassword: '',
  email: '',
  siteTitle: 'OrganizrX',
  dbDialect: 'sqlite',
}

export default function Wizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [data, setData] = useState<WizardData>(initialData)
  const [errors, setErrors] = useState<Partial<Record<keyof WizardData, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const update = <K extends keyof WizardData>(key: K, value: WizardData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  // ── Step Validation ────────────────────────────────────────────
  const validateStep = (s: number): boolean => {
    const errs: Partial<Record<keyof WizardData, string>> = {}

    if (s === 3) {
      if (!data.username || data.username.length < 3) {
        errs.username = 'Username must be at least 3 characters'
      }
      if (!data.password || data.password.length < 8) {
        errs.password = 'Password must be at least 8 characters'
      }
      if (data.password !== data.confirmPassword) {
        errs.confirmPassword = 'Passwords do not match'
      }
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errs.email = 'Invalid email address'
      }
    }

    if (s === 4) {
      if (!data.siteTitle || data.siteTitle.length < 1) {
        errs.siteTitle = 'Site title is required'
      }
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const nextStep = () => {
    if (!validateStep(step)) return
    if (step < TOTAL_STEPS) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleFinish = async () => {
    setIsSubmitting(true)
    try {
      await api.wizard.complete({
        username: data.username,
        password: data.password,
        email: data.email || undefined,
        siteTitle: data.siteTitle || undefined,
      })
      toast.success('Setup complete! Redirecting to login…')
      navigate('/login', { replace: true })
    } catch (err: unknown) {
      const message =
        err instanceof Error && 'response' in err
          ? ((err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ?? 'Setup failed')
          : 'Setup failed'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Input helper ───────────────────────────────────────────────
  const inputClass = (key: keyof WizardData) =>
    cn(
      'w-full bg-muted/50 border rounded-md px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all',
      errors[key] ? 'border-destructive' : 'border-border',
    )

  // ── Step Content ───────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Welcome to OrganizrX</h3>
            <p className="text-muted-foreground leading-relaxed">
              This wizard will guide you through the initial setup of your OrganizrX instance.
              You&apos;ll configure your database, create an admin account, and set up basic preferences.
            </p>
            <p className="text-sm text-muted-foreground">
              This process takes less than a minute.
            </p>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Database Configuration</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select your database engine. SQLite is recommended for most users and requires no additional setup.
              MySQL and PostgreSQL require an existing database server.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {(['sqlite', 'mysql', 'postgresql'] as const).map((dialect) => (
                <button
                  key={dialect}
                  type="button"
                  onClick={() => update('dbDialect', dialect)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-md border p-4 text-sm font-medium transition-all',
                    data.dbDialect === dialect
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50 hover:bg-muted',
                  )}
                >
                  <Database className="h-6 w-6" />
                  {dialect === 'sqlite' ? 'SQLite' : dialect === 'mysql' ? 'MySQL' : 'PostgreSQL'}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Note: Database connection is configured via environment variables (DATABASE_URL).
              This selection is for reference — the actual connection is established at startup.
            </p>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Create Admin Account</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create the administrator account that will have full access to OrganizrX.
            </p>
            <div className="space-y-3">
              <div>
                <label htmlFor="wiz-username" className="block text-sm font-medium text-muted-foreground mb-1">
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
                <label htmlFor="wiz-email" className="block text-sm font-medium text-muted-foreground mb-1">
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
                <label htmlFor="wiz-password" className="block text-sm font-medium text-muted-foreground mb-1">
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
                <label htmlFor="wiz-confirm" className="block text-sm font-medium text-muted-foreground mb-1">
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
                {errors.confirmPassword && <p className="mt-1 text-xs text-destructive">{errors.confirmPassword}</p>}
              </div>
            </div>
          </div>
        )

      case 4:
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

      case 5:
        return (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold">Ready to Go!</h3>
            <div className="text-left bg-muted/30 rounded-md p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Database</span>
                <span className="font-medium">{data.dbDialect === 'sqlite' ? 'SQLite' : data.dbDialect === 'mysql' ? 'MySQL' : 'PostgreSQL'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Admin User</span>
                <span className="font-medium">{data.username}</span>
              </div>
              {data.email && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{data.email}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Site Title</span>
                <span className="font-medium">{data.siteTitle}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Click &quot;Complete Setup&quot; to create your admin account and finalize the configuration.
            </p>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-2xl space-y-8">
        <h2 className="text-2xl font-bold tracking-tight text-center bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
          OrganizrX Setup
        </h2>

        {/* Stepper */}
        <div className="relative flex items-center justify-between w-full px-4">
          <div className="absolute top-1/2 left-4 right-4 h-1 bg-muted -z-10 rounded-full" />
          <div
            className="absolute top-1/2 left-4 h-1 bg-primary -z-10 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * (100 - (8 / TOTAL_STEPS))}%` }}
          />

          {STEPS.map((s, i) => {
            const stepNum = i + 1
            const Icon = s.icon
            return (
              <div key={stepNum} className="relative flex flex-col items-center group">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ring-4 ring-background',
                    step > stepNum
                      ? 'bg-primary text-primary-foreground'
                      : step === stepNum
                        ? 'bg-primary text-primary-foreground scale-110'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {step > stepNum ? <Check size={16} /> : <Icon size={16} />}
                </div>
                <span
                  className={cn(
                    'absolute top-12 text-xs font-medium transition-colors duration-300 whitespace-nowrap',
                    step >= stepNum ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Content */}
        <div className="bg-card border border-border rounded-lg p-8 shadow-sm min-h-[320px] flex flex-col justify-between">
          <div>{renderStep()}</div>

          <div className="flex justify-between mt-8 pt-4 border-t border-border">
            <button
              type="button"
              onClick={prevStep}
              disabled={step === 1 || isSubmitting}
              className="px-4 py-2 rounded-md font-medium text-sm text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>

            {step === TOTAL_STEPS ? (
              <button
                type="button"
                onClick={handleFinish}
                disabled={isSubmitting}
                className="px-6 py-2 rounded-md font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Setting up…
                  </>
                ) : (
                  'Complete Setup'
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2 rounded-md font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow transition-all transform active:scale-95"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
