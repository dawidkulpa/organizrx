import { useState, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { DropResult } from '@hello-pangea/dnd'
import { api } from '../../../api/client'
import { useUIStore } from '../../../store'

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
  const bumpSidebar = useUIStore((s) => s.bumpSidebar)
  const [tabs, setTabs] = useState<Tab[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTabs, setSelectedTabs] = useState<number[]>([])

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTab, setEditingTab] = useState<Tab | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [tabsRes, catsRes, groupsRes] = await Promise.all([
        api.tabs.getAll(),
        api.categories.getAll(),
        api.groups.getAll(),
      ])
      const tabsData = tabsRes.data.data
      setTabs(Array.isArray(tabsData) ? tabsData : [])
      const catsData = catsRes.data.data
      setCategories(Array.isArray(catsData) ? catsData : [])
      const groupData = groupsRes.data.data
      setGroups(
        Array.isArray(groupData) ? groupData : (groupData as { groups: Group[] }).groups || []
      )
    } catch {
      toast.error('Failed to load tabs configuration')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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

    // Optimistic Update
    const updatedTabs = items.map((item, index) => ({ ...item, order: index }))
    setTabs(updatedTabs)

    try {
      await api.tabs.reorder({
        tabs: updatedTabs.map((t) => ({ id: t.id, order: t.order })),
      })
      toast.success('Order updated')
      bumpSidebar()
    } catch (error) {
      toast.error('Failed to save order')
      fetchData() // Revert
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
      setTabs((prev) => prev.filter((t) => t.id !== id))
      toast.success('Tab deleted')
      bumpSidebar()
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
      setTabs((prev) => prev.filter((t) => !deletableIds.includes(t.id)))
      setSelectedTabs([])
      toast.success('Selected tabs deleted')
      bumpSidebar()
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
