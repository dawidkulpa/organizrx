import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { X, Save, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../api/client'
import { typedZodResolver } from '../utils'

// ── Interfaces ───────────────────────────────────────────────────────────────
interface Tab {
  id: number; name: string; url: string; url_local: string | null;
  image: string | null; category_id: number | null; order: number;
  group_id: number; type: number; enabled: number;
  splash: number | null; ping: number | null; ping_url: string | null;
  preload: number | null; timeout: number | null; timeout_ms: number | null;
}

interface Category { id: number; name: string; order: number; default_cat: number | null; image: string | null; }
interface Group { id: number; name: string; group_id: number; image: string | null; default_group: number | null; }

interface TabFormProps {
  tab?: Tab | null
  categories: Category[]
  groups: Group[]
  open: boolean
  onClose: () => void
  onSaved: () => void
}

// ── Validation Schema ────────────────────────────────────────────────────────
const tabSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  url: z.string().min(1, 'URL is required'),
  url_local: z.string().optional().nullable(),
category_id: z.preprocess(
(val) => (val === '' || val === null ? null : Number(val)),
    z.number().nullable().optional()
  ).optional(
),
  group_id: z.coerce.number().min(0, 'Group is required'),
  type: z.coerce.number().min(0).max(2),
  image: z.string().optional().nullable(),
  enabled: z.boolean().default(true),
  ping: z.boolean().default(false),
  ping_url: z.string().optional().nullable(),
  preload: z.boolean().default(false),
  splash: z.boolean().default(false),
  timeout: z.coerce.number().default(0),
  timeout_ms: z.coerce.number().default(0),
})

type TabFormData = z.infer<typeof tabSchema>

// ── Component ────────────────────────────────────────────────────────────────
export default function TabForm({ tab, categories, groups, open, onClose, onSaved }: TabFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TabFormData>({
    resolver: typedZodResolver(tabSchema),
    defaultValues: {
      name: '',
      url: '',
      url_local: '',
      category_id: null,
      group_id: 0,
      type: 0,
      image: '',
      enabled: true,
      ping: false,
      ping_url: '',
      preload: false,
      splash: false,
      timeout: 0,
      timeout_ms: 0,
    },
  })

  // Reset form when tab changes (Create vs Edit)
  useEffect(() => {
    if (tab) {
      reset({
        name: tab.name,
        url: tab.url,
        url_local: tab.url_local,
        category_id: tab.category_id,
        group_id: tab.group_id,
        type: tab.type,
        image: tab.image,
        enabled: Boolean(tab.enabled),
        ping: Boolean(tab.ping),
        ping_url: tab.ping_url,
        preload: Boolean(tab.preload),
        splash: Boolean(tab.splash),
        timeout: tab.timeout ?? 0,
        timeout_ms: tab.timeout_ms ?? 0,
      })
    } else {
      reset({
        name: '',
        url: '',
        url_local: '',
        category_id: null,
        group_id: 0,
        type: 0,
        image: '',
        enabled: true,
        ping: false,
        ping_url: '',
        preload: false,
        splash: false,
        timeout: 0,
        timeout_ms: 0,
      })
    }
  }, [tab, reset, open])

  const onSubmit = async (data: TabFormData) => {
    try {
      // Map booleans to numbers (1/0) for API compatibility
      const payload = {
        ...data,
        enabled: data.enabled ? 1 : 0,
        ping: data.ping ? 1 : 0,
        preload: data.preload ? 1 : 0,
        splash: data.splash ? 1 : 0,
      }

      if (tab) {
        await api.tabs.update(tab.id, payload)
        toast.success('Tab updated successfully')
      } else {
        await api.tabs.create(payload)
        toast.success('Tab created successfully')
      }
      onSaved()
      onClose()
    } catch (error) {
      toast.error('Failed to save tab')
    }
  }

  const pingEnabled = watch('ping')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {tab ? 'Edit Tab' : 'Add New Tab'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Configure tab details, visibility, and behavior.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          
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
              <label className="text-sm font-medium text-foreground">URL</label>
              <input
                {...register('url')}
                className="w-full px-3 py-2 bg-input border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                placeholder="https://example.com"
              />
              {errors.url && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.url.message}
                </p>
              )}
            </div>

            {/* Local URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Local URL <span className="text-muted-foreground font-normal">(Optional)</span></label>
              <input
                {...register('url_local')}
                className="w-full px-3 py-2 bg-input border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                placeholder="http://192.168.1.x:8080"
              />
            </div>

            {/* Image/Icon */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Image / Icon</label>
              <input
                {...register('image')}
                className="w-full px-3 py-2 bg-input border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                placeholder="fa-home or URL"
              />
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
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
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
                  <option key={grp.id} value={grp.group_id}>{grp.name}</option>
                ))}
              </select>
            </div>

             {/* Type */}
             <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Tab Type</label>
              <select
                {...register('type', { valueAsNumber: true })}
                className="w-full px-3 py-2 bg-input border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all appearance-none"
              >
                <option value={0}>Internal</option>
                <option value={1}>iFrame</option>
                <option value={2}>New Window</option>
              </select>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Behavior & Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Toggles */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                <span className="text-sm font-medium">Enabled</span>
                <input type="checkbox" {...register('enabled')} className="w-5 h-5 accent-primary rounded cursor-pointer" />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                <span className="text-sm font-medium">Preload</span>
                <input type="checkbox" {...register('preload')} className="w-5 h-5 accent-primary rounded cursor-pointer" />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                <span className="text-sm font-medium">Splash Screen</span>
                <input type="checkbox" {...register('splash')} className="w-5 h-5 accent-primary rounded cursor-pointer" />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                <span className="text-sm font-medium">Ping Status</span>
                <input type="checkbox" {...register('ping')} className="w-5 h-5 accent-primary rounded cursor-pointer" />
              </div>

            </div>
          </div>

          {/* Conditional Ping URL */}
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

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border sticky bottom-0 bg-card">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-md shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {tab ? 'Save Changes' : 'Create Tab'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
