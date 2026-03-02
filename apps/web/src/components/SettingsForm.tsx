import React, { useEffect, useState } from 'react'
import { FieldValues, Resolver, SubmitHandler, useForm, UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, Save, AlertCircle } from 'lucide-react'
import { api } from '../api/client'
import { cn } from '../utils'

interface SettingsFormProps<T extends FieldValues> {
  schema: z.ZodType<T>
  settingsKey: string
  title: string
  description?: string
  children: (form: UseFormReturn<T>) => React.ReactNode
}

export function SettingsForm<T extends FieldValues>({
  schema,
  settingsKey,
  title,
  description,
  children,
}: SettingsFormProps<T>) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<T>({
    resolver: zodResolver(schema as Parameters<typeof zodResolver>[0]) as unknown as Resolver<T>,
    mode: 'onChange',
  })

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true)
        const response = await api.settings.getAll(settingsKey)
        // Assuming API returns an object { key: value, key2: value2 }
        // or an array of { key: '...', value: '...' }
        // Based on client.ts, it returns axios response.
        // Let's assume the data payload is a Record<string, any> map of settings
        const data = response.data as Record<string, unknown>
        
        // If the API returns a list of settings objects, we might need to transform it.
        // But for now, assuming standard key-value map from backend for this category.
        // If keys are like "general.title", we assume schema matches.
        
        form.reset(data as T)
      } catch (error) {
        toast.error('Failed to load settings. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [settingsKey, form])

  const onSubmit = async (data: T) => {
    try {
      setIsSaving(true)
      const dirtyFields = Object.keys(form.formState.dirtyFields)
      
      if (dirtyFields.length === 0) {
        toast.info('No changes to save')
        return
      }

      // Update only dirty fields
      // api.settings.update takes { key, value }
      // We map the dirty fields to promises
      const updatePromises = dirtyFields.map((field) => {
        const value = data[field]
        // Convert non-string values to string if necessary, or assume API handles it.
        // client.ts says value: string. So we must stringify if it's not a string.
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
        
        return api.settings.update({
          key: field,
          value: stringValue,
        })
      })

      await Promise.all(updatePromises)

      // Re-fetch or just reset dirty state with new values
      form.reset(data)
      toast.success('Settings saved successfully')
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">{title}</h2>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit as SubmitHandler<T>)} className="space-y-8">
        <div className="grid gap-6 rounded-xl border border-border/40 bg-card/50 p-6 backdrop-blur-sm">
          {children(form)}
        </div>

        <div className="sticky bottom-6 flex items-center justify-between rounded-lg border border-border bg-background/80 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {form.formState.isDirty ? (
              <>
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-amber-500 font-medium">Unsaved changes</span>
              </>
            ) : (
              <span>Values are up to date</span>
            )}
          </div>

          <button
            type="submit"
            disabled={!form.formState.isDirty || isSaving}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
              "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            )}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}
