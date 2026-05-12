import type { UseFormReturn } from 'react-hook-form'
import { z } from 'zod'

const INPUT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
const CHECKBOX_CLASS = 'h-4 w-4 rounded border-input text-primary focus:ring-primary'
const LABEL_CLASS =
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
const HELP_CLASS = 'text-[0.8rem] text-muted-foreground'

export const authSchema = z.object({
  authMethod: z.enum(['local', 'ldap', 'both']),
  sessionTimeout: z.coerce.number().min(1, 'Must be at least 1 minute'),
  maxLoginAttempts: z.coerce.number().min(1, 'Must be at least 1 attempt'),
  lockoutDuration: z.coerce.number().min(1, 'Must be at least 1 minute'),
  enforce2fa: z.enum(['disabled', 'optional', 'required']),
  ssoEnabled: z.boolean(),
  cookieDomain: z.string().optional(),
  cookieName: z.string().min(1, 'Required'),
  cookieExpire: z.coerce.number().min(1, 'Minimum 1 hour'),
  plexSsoEnabled: z.boolean(),
  oidcSsoEnabled: z.boolean(),
  oidc_client_id: z.string().optional(),
  oidc_client_secret: z.string().optional(),
  oidc_provider_url: z.string().optional(),
  oidc_redirect_uri: z.string().optional(),
})

export type AuthenticationFormValues = z.infer<typeof authSchema>

type FormApi = UseFormReturn<AuthenticationFormValues>
type FieldName = keyof AuthenticationFormValues & string

export const authenticationSectionClass =
  'space-y-6 border-t border-border/60 pt-6 first:border-t-0 first:pt-0'

export function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1">
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

export function TextField({
  form,
  id,
  label,
  help,
  type,
  placeholder,
}: {
  form: FormApi
  id: FieldName
  label: string
  help?: string
  type?: 'text' | 'number' | 'password'
  placeholder?: string
}) {
  const error = form.formState.errors[id]
  const errorMessage = typeof error?.message === 'string' ? error.message : undefined

  return (
    <div className="space-y-2">
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      {help ? <p className={HELP_CLASS}>{help}</p> : null}
      <input
        id={id}
        type={type ?? 'text'}
        {...form.register(id)}
        className={INPUT_CLASS}
        placeholder={placeholder}
      />
      {errorMessage ? (
        <p className="text-[0.8rem] font-medium text-destructive">{errorMessage}</p>
      ) : null}
    </div>
  )
}

export function SelectField({
  form,
  id,
  label,
  help,
  options,
}: {
  form: FormApi
  id: FieldName
  label: string
  help?: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      {help ? <p className={HELP_CLASS}>{help}</p> : null}
      <select id={id} {...form.register(id)} className={INPUT_CLASS}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function ToggleField({
  form,
  id,
  label,
  help,
}: {
  form: FormApi
  id: FieldName
  label: string
  help: string
}) {
  return (
    <div className="flex items-center space-x-3 rounded-lg border border-border/60 bg-muted/20 p-4">
      <input id={id} type="checkbox" {...form.register(id)} className={CHECKBOX_CLASS} />
      <div className="space-y-1">
        <label htmlFor={id} className={LABEL_CLASS}>
          {label}
        </label>
        <p className={HELP_CLASS}>{help}</p>
      </div>
    </div>
  )
}
