import { AlertCircle } from 'lucide-react'
import type { UseFormRegister, FieldErrors, UseFormWatch } from 'react-hook-form'
import type { TabFormData, Category, Group } from './schema'

interface TabFormFieldsProps {
  register: UseFormRegister<TabFormData>
  errors: FieldErrors<TabFormData>
  watch: UseFormWatch<TabFormData>
  categories: Category[]
  groups: Group[]
  isDefault?: boolean
}

export function TabFormFields({
  register,
  errors,
  watch,
  categories,
  groups,
  isDefault,
}: TabFormFieldsProps) {
  const pingEnabled = watch('ping')
  const tabType = watch('type')

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Name</label>
          <input
            {...register('name')}
            className="w-full px-3 py-2 bg-input border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            placeholder="My Dashboard"
          />
          {errors.name && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.name.message}
            </p>
          )}
        </div>

        {/* URL */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            URL{' '}
            {isDefault && (
              <span className="text-xs text-muted-foreground ml-2">
                (Cannot change URL for built-in tabs)
              </span>
            )}
          </label>
          {tabType === 1 && !isDefault ? (
            <select
              {...register('url')}
              disabled={isDefault}
              className="w-full px-3 py-2 bg-input border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="/">Dashboard (/)</option>
              <option value="/settings">Settings (/settings)</option>
              <option value="/users">Users (/users)</option>
            </select>
          ) : (
            <input
              {...register('url')}
              disabled={isDefault}
              title={isDefault ? 'Cannot change type/URL for built-in tabs' : ''}
              className="w-full px-3 py-2 bg-input border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="https://example.com"
            />
          )}
          {errors.url && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.url.message}
            </p>
          )}
        </div>

        {/* Local URL */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Local URL <span className="text-muted-foreground font-normal">(Optional)</span>
          </label>
          <input
            {...register('url_local')}
            className="w-full px-3 py-2 bg-input border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            placeholder="http://192.168.1.x:8080"
          />
        </div>

        {/* Icon Class */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Icon Class</label>
          <input
            {...register('image')}
            className="w-full px-3 py-2 bg-input border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            placeholder="fa-home"
          />
          <p className="text-xs text-muted-foreground">FontAwesome class name</p>
        </div>

        {/* Custom Image URL */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Custom Image URL</label>
          <input
            {...register('custom_image_url')}
            className="w-full px-3 py-2 bg-input border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            placeholder="https://example.com/icon.png"
          />
          <p className="text-xs text-muted-foreground">URL to a custom icon image</p>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Category</label>
          <select
            {...register('category_id')}
            className="w-full px-3 py-2 bg-input border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all appearance-none"
          >
            <option value="">None</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Group */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Minimum Access Group</label>
          <select
            {...register('group_id', { valueAsNumber: true })}
            className="w-full px-3 py-2 bg-input border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all appearance-none"
          >
            <option value={0}>Public</option>
            {groups.map((grp) => (
              <option key={grp.id} value={grp.group_id}>
                {grp.name}
              </option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Tab Type{' '}
            {isDefault && (
              <span className="text-xs text-muted-foreground ml-2">(Fixed for built-in tabs)</span>
            )}
          </label>
          <select
            {...register('type', { valueAsNumber: true })}
            disabled={isDefault}
            title={isDefault ? 'Cannot change type/URL for built-in tabs' : ''}
            className="w-full px-3 py-2 bg-input border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value={0}>iFrame</option>
            <option value={1}>Internal</option>
            <option value={2}>New Window</option>
          </select>
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">
          Behavior & Options
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
            <span className="text-sm font-medium">Enabled</span>
            <input
              type="checkbox"
              {...register('enabled')}
              className="w-5 h-5 accent-primary rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
            <span className="text-sm font-medium">Preload</span>
            <input
              type="checkbox"
              {...register('preload')}
              className="w-5 h-5 accent-primary rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
            <span className="text-sm font-medium">Splash Screen</span>
            <input
              type="checkbox"
              {...register('splash')}
              className="w-5 h-5 accent-primary rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
            <span className="text-sm font-medium">Ping Status</span>
            <input
              type="checkbox"
              {...register('ping')}
              className="w-5 h-5 accent-primary rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {pingEnabled && (
        <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
          <label className="text-sm font-medium text-foreground">Ping URL</label>
          <input
            {...register('ping_url')}
            className="w-full px-3 py-2 bg-input border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            placeholder="URL to ping for status check"
          />
        </div>
      )}
    </>
  )
}
