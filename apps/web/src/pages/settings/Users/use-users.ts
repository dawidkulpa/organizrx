import { useState, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { api } from '../../../api/client'

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
  const [users, setUsers] = useState<User[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [usersRes, groupsRes] = await Promise.all([api.users.getAll(), api.groups.getAll()])
      const userData = usersRes.data.data
      setUsers(Array.isArray(userData) ? userData : (userData as { users: User[] }).users || [])
      const groupData = groupsRes.data.data
      setGroups(
        Array.isArray(groupData) ? groupData : (groupData as { groups: Group[] }).groups || []
      )
    } catch (error) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
      await Promise.all(selectedUsers.map((id) => api.users.delete(id)))
      toast.success('Users deleted')
      fetchData()
      setSelectedUsers([])
    } catch (error) {
      toast.error('Failed to delete some users')
    }
  }

  const handleBulkLock = async (locked: boolean) => {
    try {
      await Promise.all(selectedUsers.map((id) => api.users.update(id, { locked: locked ? 1 : 0 })))
      toast.success(locked ? 'Users locked' : 'Users unlocked')
      fetchData()
      setSelectedUsers([])
    } catch (error) {
      toast.error('Failed to update users')
    }
  }

  const handleBulkGroupChange = async () => {
    if (bulkGroupId === '') return
    try {
      await Promise.all(selectedUsers.map((id) => api.users.update(id, { group_id: bulkGroupId })))
      toast.success('Group updated for selected users')
      fetchData()
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
      await api.users.delete(user.id)
      toast.success('User deleted')
      fetchData()
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
