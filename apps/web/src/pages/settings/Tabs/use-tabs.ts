import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DropResult } from '@hello-pangea/dnd'
import { api } from '../../../api/client'
import { queryKeys } from '../../../api/query-keys'

export interface Tab {
  id: number
  name: string
  url: string
  url_local: string | null
  image: string | null
  category_id: number | null
  order: number
  group_id: number
  type: number
  enabled: number
  isDefault: number | null
  splash: number | null
  ping: number | null
  ping_url: string | null
  preload: number | null
  timeout: number | null
  timeout_ms: number | null
}

export interface Category {
  id: number
  name: string
  order: number
  isDefault: number | null
  image: string | null
}
export interface Group {
  id: number
  name: string
  group_id: number
  image: string | null
  isDefault: number | null
}

export function useTabs() {
  const queryClient = useQueryClient()
  const tabsQuery = useQuery({ queryKey: queryKeys.tabs.all, queryFn: () => api.tabs.getAll() })
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.getAll(),
  })
  const groupsQuery = useQuery({
    queryKey: queryKeys.groups.all,
    queryFn: () => api.groups.getAll(),
  })

  const tabs = (tabsQuery.data?.data?.data as Tab[] | undefined) ?? []
  const categories = (categoriesQuery.data?.data?.data as Category[] | undefined) ?? []
  const groupData = groupsQuery.data?.data?.data
  const groups = Array.isArray(groupData)
    ? groupData
    : ((groupData as { groups: Group[] } | undefined)?.groups ?? [])
  const isLoading = tabsQuery.isLoading || categoriesQuery.isLoading || groupsQuery.isLoading

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTabs, setSelectedTabs] = useState<number[]>([])

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTab, setEditingTab] = useState<Tab | null>(null)

  const fetchData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.tabs.all }),
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all }),
    ])
  }

  const filteredTabs = useMemo(() => {
    let result = [...tabs]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (t) => t.name.toLowerCase().includes(q) || t.url.toLowerCase().includes(q)
      )
    }

    if (selectedCategory !== 'all') {
      const catId = parseInt(selectedCategory)
      result = result.filter((t) => t.category_id === catId)
    }

    return result.sort((a, b) => a.order - b.order)
  }, [tabs, searchQuery, selectedCategory])

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    if (searchQuery || selectedCategory !== 'all') {
      toast.error('Cannot reorder while filtered')
      return
    }

    const items = Array.from(tabs)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    const updatedTabs = items.map((item, index) => ({ ...item, order: index }))
    const snapshot = queryClient.getQueryData(queryKeys.tabs.all)
    queryClient.setQueryData(queryKeys.tabs.all, (old: typeof tabsQuery.data) => ({
      ...old,
      data: { ...old?.data, data: updatedTabs },
    }))

    try {
      await api.tabs.reorder({
        tabs: updatedTabs.map((t) => ({ id: t.id, order: t.order })),
      })
      toast.success('Order updated')
      queryClient.invalidateQueries({ queryKey: queryKeys.tabs.all })
    } catch (error) {
      toast.error('Failed to save order')
      queryClient.setQueryData(queryKeys.tabs.all, snapshot)
    }
  }

  const handleEdit = (tab: Tab) => {
    setEditingTab(tab)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (tabs.find((t) => t.id === id)?.isDefault === 1) return
    if (!confirm('Are you sure you want to delete this tab?')) return
    try {
      await api.tabs.delete(id)
      toast.success('Tab deleted')
      queryClient.invalidateQueries({ queryKey: queryKeys.tabs.all })
    } catch (error) {
      toast.error('Failed to delete tab')
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedTabs.length} tabs?`)) return
    const deletableIds = selectedTabs.filter(
      (id) => !tabs.find((t) => t.id === id && t.isDefault === 1)
    )
    if (deletableIds.length === 0) return
    try {
      await Promise.all(deletableIds.map((id) => api.tabs.delete(id)))
      setSelectedTabs([])
      toast.success('Selected tabs deleted')
      queryClient.invalidateQueries({ queryKey: queryKeys.tabs.all })
    } catch (error) {
      toast.error('Failed to delete some tabs')
    }
  }

  const toggleSelection = (id: number) => {
    setSelectedTabs((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const toggleSelectAll = () => {
    if (selectedTabs.length === filteredTabs.length) {
      setSelectedTabs([])
    } else {
      setSelectedTabs(filteredTabs.map((t) => t.id))
    }
  }

  const getCategoryName = (id: number | null) => {
    if (!id) return 'Uncategorized'
    return categories.find((c) => c.id === id)?.name || 'Unknown'
  }

  const getGroupName = (id: number) => {
    if (id === 0) return 'Public'
    return groups.find((g) => g.group_id === id)?.name || 'Unknown'
  }

  return {
    tabs,
    categories,
    groups,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedTabs,
    setSelectedTabs,
    isFormOpen,
    setIsFormOpen,
    editingTab,
    setEditingTab,
    filteredTabs,
    fetchData,
    handleDragEnd,
    handleEdit,
    handleDelete,
    handleBulkDelete,
    toggleSelection,
    toggleSelectAll,
    getCategoryName,
    getGroupName,
  }
}
