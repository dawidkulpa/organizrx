import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '../../../api/client'
import { queryKeys } from '../../../api/query-keys'

export interface User {
  id: number
  username: string
  email: string | null
  group_id: number
  image: string | null
  locked: number
  register_date: string | null
  auth_service: string | null
}

export interface Group {
  id: number
  name: string
  group_id: number
  image: string | null
  isDefault: number | null
}

export function useUsers() {
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [groupFilter, setGroupFilter] = useState<number | 'all'>('all')
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])

  // Dialog states
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isUserFormOpen, setIsUserFormOpen] = useState(false)

  // Bulk Group Change State
  const [isBulkGroupOpen, setIsBulkGroupOpen] = useState(false)
  const [bulkGroupId, setBulkGroupId] = useState<number | ''>('')

  const usersQuery = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => {
      const res = await api.users.getAll()
      const userData = res.data.data
      return Array.isArray(userData) ? userData : (userData as { users: User[] }).users || []
    },
  })

  const groupsQuery = useQuery({
    queryKey: queryKeys.groups.all,
    queryFn: async () => {
      const res = await api.groups.getAll()
      const groupData = res.data.data
      return Array.isArray(groupData) ? groupData : (groupData as { groups: Group[] }).groups || []
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => api.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      api.users.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })

  const users = usersQuery.data || []
  const groups = groupsQuery.data || []
  const loading = usersQuery.isLoading || groupsQuery.isLoading

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesGroup = groupFilter === 'all' || user.group_id === groupFilter

      return matchesSearch && matchesGroup
    })
  }, [users, searchQuery, groupFilter])

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredUsers.map((u) => u.id))
    }
  }

  const handleSelectUser = (id: number) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter((uid) => uid !== id))
    } else {
      setSelectedUsers([...selectedUsers, id])
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedUsers.length} users?`)) return

    try {
      await Promise.all(selectedUsers.map((id) => deleteUserMutation.mutateAsync(id)))
      toast.success('Users deleted')
      setSelectedUsers([])
    } catch (error) {
      toast.error('Failed to delete some users')
    }
  }

  const handleBulkLock = async (locked: boolean) => {
    try {
      await Promise.all(
        selectedUsers.map((id) =>
          updateUserMutation.mutateAsync({ id, data: { locked: locked ? 1 : 0 } })
        )
      )
      toast.success(locked ? 'Users locked' : 'Users unlocked')
      setSelectedUsers([])
    } catch (error) {
      toast.error('Failed to update users')
    }
  }

  const handleBulkGroupChange = async () => {
    if (bulkGroupId === '') return
    try {
      await Promise.all(
        selectedUsers.map((id) =>
          updateUserMutation.mutateAsync({ id, data: { group_id: bulkGroupId } })
        )
      )
      toast.success('Group updated for selected users')
      setSelectedUsers([])
      setIsBulkGroupOpen(false)
      setBulkGroupId('')
    } catch (error) {
      toast.error('Failed to update groups')
    }
  }

  const handleDelete = async (user: User) => {
    if (
      !confirm(
        `Are you sure you want to delete user ${user.username}? This action cannot be undone.`
      )
    )
      return
    try {
      await deleteUserMutation.mutateAsync(user.id)
      toast.success('User deleted')
    } catch (error) {
      toast.error('Failed to delete user')
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setIsUserFormOpen(true)
  }

  const getGroupName = (groupId: number) => {
    return groups.find((g) => g.group_id === groupId)?.name || 'Unknown'
  }

  const fetchData = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
  }

  return {
    users,
    groups,
    loading,
    searchQuery,
    setSearchQuery,
    groupFilter,
    setGroupFilter,
    selectedUsers,
    filteredUsers,
    isInviteOpen,
    setIsInviteOpen,
    editingUser,
    setEditingUser,
    isUserFormOpen,
    setIsUserFormOpen,
    isBulkGroupOpen,
    setIsBulkGroupOpen,
    bulkGroupId,
    setBulkGroupId,
    fetchData,
    handleSelectAll,
    handleSelectUser,
    handleBulkDelete,
    handleBulkLock,
    handleBulkGroupChange,
    handleDelete,
    handleEdit,
    getGroupName,
  }
}
