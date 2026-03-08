import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { cn, typedZodResolver } from '../../utils'
import { toast } from 'sonner'
import { Users, Plus, Pencil, Trash2, Shield, X, Save, Image as ImageIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

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

export default function SettingsGroups() {
  const [groups, setGroups] = useState<Group[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
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

  const fetchData = async () => {
    try {
      setLoading(true)
      const [groupsRes, usersRes] = await Promise.all([api.groups.getAll(), api.users.getAll()])
      const groupData = groupsRes.data.data
      setGroups(
        Array.isArray(groupData) ? groupData : (groupData as { groups: Group[] }).groups || []
      )
      const userData = usersRes.data.data
      setUsers(Array.isArray(userData) ? userData : (userData as { users: User[] }).users || [])
    } catch (error) {
      toast.error('Failed to load groups')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

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
    try {
      if (editingGroup) {
        await api.groups.update(editingGroup.id, data)
        toast.success('Group updated')
      } else {
        await api.groups.create(data)
        toast.success('Group created')
      }
      fetchData()
      handleCloseModal()
    } catch (error) {
      toast.error('Failed to save group')
    }
  }

  const handleDelete = async (group: Group) => {
    if (group.isDefault === 1) {
      toast.error('Cannot delete the default group')
      return
    }

    if (!confirm(`Are you sure you want to delete group "${group.name}"?`)) return

    try {
      await api.groups.delete(group.id)
      toast.success('Group deleted')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete group')
    }
  }

  const getMemberCount = (groupId: number) => {
    return users.filter((u) => u.group_id === groupId).length
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground">Groups</h3>
          <p className="text-sm text-muted-foreground">Manage user groups and permissions.</p>
        </div>
        <button
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
                  {group.isDefault === 1 && (
                    <span className="inline-flex items-center rounded-full border border-transparent bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                      Default
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center border-t border-border bg-muted/20 p-2">
                <button
                  onClick={() => handleOpenModal(group)}
                  className="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-3"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </button>
                <div className="mx-1 h-4 w-[1px] bg-border" />
                {group.isDefault === 1 ? (
                  <div className="flex-1 h-9" />
                ) : (
                  <button
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
                onClick={handleCloseModal}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Name</label>
                <input
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
                <label className="text-sm font-medium text-foreground">Image URL (Optional)</label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
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
