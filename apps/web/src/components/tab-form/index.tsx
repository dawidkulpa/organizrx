import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { X, Save } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../api/client'
import { queryKeys } from '../../api/query-keys'
import { typedZodResolver } from '../../utils'
import { tabSchema, type TabFormData, type Tab, type Category, type Group } from './schema'
import { TabFormFields } from './TabFormFields'

interface TabFormProps {
  tab?: Tab | null
  categories: Category[]
  groups: Group[]
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export default function TabForm({ tab, categories, groups, open, onClose, onSaved }: TabFormProps) {
  const queryClient = useQueryClient()
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
    void open

    if (tab) {
      const isUrl = tab.image?.startsWith('http') || tab.image?.startsWith('/')
      reset({
        name: tab.name,
        url: tab.url,
        url_local: tab.url_local,
        category_id: tab.category_id,
        group_id: tab.group_id,
        type: tab.type,
        image: isUrl ? '' : tab.image,
        custom_image_url: isUrl ? tab.image : '',
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
        custom_image_url: '',
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
      const { custom_image_url: _customImageUrl, ...rest } = data
      const payload = {
        ...rest,
        image: data.image || data.custom_image_url || '',
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
      queryClient.invalidateQueries({ queryKey: queryKeys.tabs.all })
      onClose()
    } catch (error) {
      toast.error('Failed to save tab')
    }
  }

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
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <TabFormFields
            register={register}
            errors={errors}
            watch={watch}
            categories={categories}
            groups={groups}
            isDefault={tab?.isDefault === 1}
          />

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
