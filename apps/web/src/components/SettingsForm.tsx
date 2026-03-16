import React, { useEffect, useState } from 'react'
import { FieldValues, SubmitHandler, useForm, UseFormReturn } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Save, AlertCircle } from 'lucide-react'
import { api } from '../api/client'
import { cn, typedZodResolver } from '../utils'
import { queryKeys } from '../api/query-keys'

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
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null)

  const form = useForm<T>({
    resolver: typedZodResolver<T>(schema),
    mode: 'onChange',
  })

  // Fetch settings with React Query
  const settingsQuery = useQuery({
    queryKey: queryKeys.settings.all(settingsKey),
    queryFn: () => api.settings.getAll(settingsKey),
  })

  // Reset form when query data arrives
  useEffect(() => {
    if (settingsQuery.data) {
      const data = settingsQuery.data.data.data as Record<string, unknown>
      form.reset(data as T)
    }
  }, [settingsQuery.data, form])

  // Auto-clear success status after 3 seconds
  useEffect(() => {
    if (saveStatus === 'success') {
      const timer = setTimeout(() => {
        setSaveStatus(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [saveStatus])

  const saveMutation = useMutation({
    mutationFn: async (data: T) => {
      const dirtyFields = Object.keys(form.formState.dirtyFields)

      if (dirtyFields.length === 0) {
        toast.info('No changes to save')
        return data
      }

      const updatePromises = dirtyFields.map((field) => {
        const value = data[field]
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value)

        return api.settings.update({
          key: field,
          value: stringValue,
        })
      })

      await Promise.all(updatePromises)
      return data
    },
    onSuccess: (data) => {
      form.reset(data)
      setSaveStatus('success')
    },
    onError: () => {
      setSaveStatus('error')
    },
  })

  const onSubmit = async (data: T) => {
    await saveMutation.mutateAsync(data)
  }

  if (settingsQuery.isLoading) {
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
            ) : saveStatus === 'success' ? (
              <span className="text-green-600 font-medium">Settings saved successfully</span>
            ) : saveStatus === 'error' ? (
              <span className="text-red-600 font-medium">Failed to save settings</span>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={!form.formState.isDirty || saveMutation.isPending}
            className={cn(
              'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
              'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
            )}
          >
            {saveMutation.isPending ? (
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
