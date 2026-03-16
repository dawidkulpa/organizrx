import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { cn, typedZodResolver } from '../../utils'
import { toast } from 'sonner'
import { Users, Plus, Pencil, Trash2, Shield, X, Save, Image as ImageIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useState } from 'react'
import { queryKeys } from '../../api/query-keys'
import { EmptyState } from '../../components/EmptyState'

interface Group {
  id: number
  name: string
  group_id: number
  image: string | null
  isDefault: number | null
}

interface User {
  id: number
  group_id: number
}

const groupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  image: z.string().optional().or(z.literal('')),
})

type GroupFormData = z.infer<typeof groupSchema>

const BUILT_IN_GROUP_IDS = [0, 4, 999]

function isBuiltInGroup(group: Group): boolean {
  return group.isDefault === 1 || BUILT_IN_GROUP_IDS.includes(group.group_id)
}

export default function SettingsGroups() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GroupFormData>({
    resolver: typedZodResolver(groupSchema),
  })

  // Fetch groups
  const groupsQuery = useQuery({
    queryKey: queryKeys.groups.all,
    queryFn: async () => {
      const res = await api.groups.getAll()
      const data = res.data.data
      return Array.isArray(data) ? data : (data as { groups: Group[] }).groups || []
    },
  })

  const usersQuery = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => {
      const res = await api.users.getAll()
      const data = res.data.data
      return Array.isArray(data) ? data : (data as { users: User[] }).users || []
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: GroupFormData) => api.groups.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all })
      toast.success('Group created')
      handleCloseModal()
    },
    onError: () => {
      toast.error('Failed to save group')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; formData: GroupFormData }) =>
      api.groups.update(data.id, data.formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all })
      toast.success('Group updated')
      handleCloseModal()
    },
    onError: () => {
      toast.error('Failed to save group')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (groupId: number) => api.groups.delete(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all })
      toast.success('Group deleted')
    },
    onError: () => {
      toast.error('Failed to delete group')
    },
  })

  const handleOpenModal = (group?: Group) => {
    if (group) {
      setEditingGroup(group)
      reset({
        name: group.name,
        image: group.image || '',
      })
    } else {
      setEditingGroup(null)
      reset({
        name: '',
        image: '',
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingGroup(null)
    reset()
  }

  const onSubmit = async (data: GroupFormData) => {
    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, formData: data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleDelete = (group: Group) => {
    if (isBuiltInGroup(group)) {
      toast.error('Cannot delete a built-in group')
      return
    }

    if (!confirm(`Are you sure you want to delete group "${group.name}"?`)) return

    deleteMutation.mutate(group.id)
  }

  const getMemberCount = (groupId: number) => {
    return (usersQuery.data ?? []).filter((u) => u.group_id === groupId).length
  }

  const loading = groupsQuery.isLoading || usersQuery.isLoading
  const groups = groupsQuery.data ?? []

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground">Groups</h3>
          <p className="text-sm text-muted-foreground">Manage user groups and permissions.</p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Group
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-lg border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          message="No custom groups. Click Add Group to organize users."
          actionLabel="Add Group"
          onAction={() => handleOpenModal()}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <div
              key={group.id}
              className="group relative overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-primary/50"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative h-12 w-12 overflow-hidden rounded-full bg-muted flex items-center justify-center">
                      {group.image ? (
                        <img
                          src={group.image}
                          alt={group.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Shield className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold tracking-tight">{group.name}</h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {getMemberCount(group.group_id)} members
                      </p>
                    </div>
                  </div>
                  {isBuiltInGroup(group) && (
                    <span className="inline-flex items-center rounded-full border border-transparent bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                      Built-in
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center border-t border-border bg-muted/20 p-2">
                <button
                  type="button"
                  onClick={() => handleOpenModal(group)}
                  className="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-3"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </button>
                <div className="mx-1 h-4 w-[1px] bg-border" />
                {isBuiltInGroup(group) ? (
                  <div className="flex-1 h-9" />
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDelete(group)}
                    className="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-destructive/10 hover:text-destructive h-9 px-3"
                    title="Delete group"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border rounded-lg shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
              <h2 className="text-lg font-semibold text-foreground">
                {editingGroup ? 'Edit Group' : 'Create Group'}
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="space-y-2">
                <label htmlFor="groupName" className="text-sm font-medium text-foreground">
                  Name
                </label>
                <input
                  id="groupName"
                  {...register('name')}
                  className={cn(
                    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                    errors.name && 'border-destructive focus-visible:ring-destructive'
                  )}
                  placeholder="Group Name"
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="groupImage" className="text-sm font-medium text-foreground">
                  Image URL (Optional)
                </label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    id="groupImage"
                    {...register('image')}
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-9 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="https://example.com/image.png"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
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
                  {editingGroup ? 'Save Changes' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
