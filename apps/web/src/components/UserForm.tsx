import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { api } from '../api/client'
import { toast } from 'sonner'
import { cn, typedZodResolver } from '../utils'
import { X, Save } from 'lucide-react'

interface User {
  id: number
  username: string
  email: string | null
  group_id: number
  image: string | null
  locked: number
  register_date: string | null
  auth_service: string | null
}

interface Group {
  id: number
  name: string
  group_id: number
  image: string | null
  isDefault: number | null
}

interface UserFormProps {
  user: User
  groups: Group[]
  open: boolean
  onClose: () => void
  onSaved: () => void
}

const userSchema = z.object({
  email: z.string().email().optional().or(z.literal('')),
  group_id: z.coerce.number().min(0, 'Group is required'),
  locked: z.boolean(),
})

type UserFormData = z.infer<typeof userSchema>

export default function UserForm({ user, groups, open, onClose, onSaved }: UserFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: typedZodResolver(userSchema),
    defaultValues: {
      email: user.email || '',
      group_id: user.group_id,
      locked: user.locked === 1,
    },
  })

  // Update form when user prop changes
  useEffect(() => {
    if (user) {
      reset({
        email: user.email || '',
        group_id: user.group_id,
        locked: user.locked === 1,
      })
    }
  }, [user, reset])

  const onSubmit = async (data: UserFormData) => {
    try {
      await api.users.update(user.id, {
        email: data.email,
        group_id: data.group_id,
        locked: data.locked ? 1 : 0,
      })
      toast.success('User updated successfully')
      onSaved()
      onClose()
    } catch (error) {
      toast.error('Failed to update user')
    }
  }

  const isLocked = watch('locked')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border rounded-lg shadow-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
          <h2 className="text-lg font-semibold text-foreground">Edit User: {user.username}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              {...register('email')}
              className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                errors.email && 'border-destructive focus-visible:ring-destructive'
              )}
              placeholder="email@example.com"
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Group</label>
            <select
              {...register('group_id')}
              className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                errors.group_id && 'border-destructive focus-visible:ring-destructive'
              )}
            >
              {groups.map((group) => (
                <option key={group.id} value={group.group_id}>
                  {group.name}
                </option>
              ))}
            </select>
            {errors.group_id && (
              <p className="text-xs text-destructive">{errors.group_id.message}</p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              Status
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-semibold',
                  isLocked ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'
                )}
              >
                {isLocked ? 'Locked' : 'Active'}
              </span>
            </label>
            <button
              type="button"
              onClick={() => setValue('locked', !isLocked)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isLocked ? 'bg-input' : 'bg-green-500'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-background transition-transform',
                  isLocked ? 'translate-x-1' : 'translate-x-6'
                )}
              />
            </button>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:brightness-110 transition-all',
                isSubmitting && 'opacity-70 cursor-wait'
              )}
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
