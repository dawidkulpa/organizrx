import { useState, useEffect, useMemo } from 'react'
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd'
import {
  Plus,
  Search,
  Filter,
  GripVertical,
  Pencil,
  Trash2,
  Loader2,
  LayoutGrid
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../api/client'
import { cn } from '../../utils'
import TabForm from '../../components/TabForm'


// ── Interfaces ───────────────────────────────────────────────────────────────
interface Tab {
  id: number; name: string; url: string; url_local: string | null;
  image: string | null; category_id: number | null; order: number;
  group_id: number; type: number; enabled: number;
  splash: number | null; ping: number | null; ping_url: string | null;
  preload: number | null; timeout: number | null; timeout_ms: number | null;
}

interface Category { id: number; name: string; order: number; isDefault: number | null; image: string | null; }
interface Group { id: number; name: string; group_id: number; image: string | null; isDefault: number | null; }

// ── Component ────────────────────────────────────────────────────────────────
export default function TabsSettings() {
  // State
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

  // Fetch Data
  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [tabsRes, catsRes, groupsRes] = await Promise.all([
        api.tabs.getAll(),
        api.categories.getAll(),
        api.groups.getAll(),
      ])
      // Handle potential data envelope variations
      setTabs(tabsRes.data.data || tabsRes.data)
      setCategories(catsRes.data.data || catsRes.data)
      setGroups(groupsRes.data.data || groupsRes.data)
    } catch {
      toast.error('Failed to load tabs configuration')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filtering & Sorting
  const filteredTabs = useMemo(() => {
    let result = [...tabs]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (t) => 
          t.name.toLowerCase().includes(q) || 
          t.url.toLowerCase().includes(q)
      )
    }

    if (selectedCategory !== 'all') {
      const catId = parseInt(selectedCategory)
      result = result.filter((t) => t.category_id === catId)
    }

    return result.sort((a, b) => a.order - b.order)
  }, [tabs, searchQuery, selectedCategory])

  // Drag & Drop Handler
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
    } catch (error) {
      toast.error('Failed to save order')
      fetchData() // Revert
    }
  }

  // Actions
  const handleEdit = (tab: Tab) => {
    setEditingTab(tab)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tab?')) return
    try {
      await api.tabs.delete(id)
      setTabs((prev) => prev.filter((t) => t.id !== id))
      toast.success('Tab deleted')
    } catch (error) {
      toast.error('Failed to delete tab')
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedTabs.length} tabs?`)) return
    try {
      // Execute sequentially or parallel depending on API capability. 
      // Assuming parallel is fine for now.
      await Promise.all(selectedTabs.map((id) => api.tabs.delete(id)))
      setTabs((prev) => prev.filter((t) => !selectedTabs.includes(t.id)))
      setSelectedTabs([])
      toast.success('Selected tabs deleted')
    } catch (error) {
      toast.error('Failed to delete some tabs')
    }
  }

  const toggleSelection = (id: number) => {
    setSelectedTabs((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
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
    return groups.find((g) => g.group_id === id)?.name || 'Unknown' // Note: using group_id to match TabForm logic
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header & Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tab Management</h1>
          <p className="text-muted-foreground">Manage your dashboard tabs and navigation links.</p>
        </div>
        <button
          onClick={() => {
            setEditingTab(null)
            setIsFormOpen(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Tab
        </button>
      </div>

      {/* Filters & Bulk Actions */}
      <div className="bg-card border border-border rounded-lg p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        
        {/* Left: Filters */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tabs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-input border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          
          <div className="relative w-full md:w-48">
             <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
             <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-input border border-input rounded-md text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
             >
               <option value="all">All Categories</option>
               {categories.map(cat => (
                 <option key={cat.id} value={cat.id}>{cat.name}</option>
               ))}
             </select>
          </div>
        </div>

        {/* Right: Bulk Actions */}
        {selectedTabs.length > 0 && (
          <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-200">
            <span className="text-sm font-medium text-muted-foreground mr-2">{selectedTabs.length} selected</span>
            <button
              onClick={handleBulkDelete}
              className="p-2 text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
              title="Delete Selected"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Tab List */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        {filteredTabs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <LayoutGrid className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-foreground">No tabs found</h3>
            <p>Try adjusting your filters or add a new tab.</p>
          </div>
        ) : (
          <>
             {/* Header Row */}
             <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto_auto] gap-4 p-4 border-b border-border bg-muted/30 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
               <div className="flex items-center gap-3 w-12">
                 <input 
                   type="checkbox" 
                   checked={selectedTabs.length === filteredTabs.length && filteredTabs.length > 0}
                   onChange={toggleSelectAll}
                   className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                 />
                 <span className="sr-only">Select All</span>
               </div>
               <div>Name</div>
               <div className="hidden md:block">Details</div>
               <div className="hidden md:block">Group</div>
               <div className="text-center">Status</div>
               <div className="text-right">Actions</div>
             </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="tabs-list">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="divide-y divide-border">
                    {filteredTabs.map((tab, index) => (
                      <Draggable 
                        key={tab.id} 
                        draggableId={String(tab.id)} 
                        index={index}
                        isDragDisabled={searchQuery !== '' || selectedCategory !== 'all'}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "grid grid-cols-[auto_1fr_1fr_1fr_auto_auto] gap-4 p-4 items-center group transition-colors",
                              snapshot.isDragging ? "bg-accent shadow-lg z-10" : "hover:bg-muted/50",
                              selectedTabs.includes(tab.id) && "bg-muted/30"
                            )}
                          >
                            {/* Drag Handle & Checkbox */}
                            <div className="flex items-center gap-3">
                              <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-foreground">
                                <GripVertical className="w-5 h-5" />
                              </div>
                              <input 
                                type="checkbox"
                                checked={selectedTabs.includes(tab.id)}
                                onChange={() => toggleSelection(tab.id)}
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                            </div>

                            {/* Name & URL */}
                            <div className="min-w-0">
                              <div className="font-medium text-foreground flex items-center gap-2">
                                {tab.image && !tab.image.startsWith('fa-') && !tab.image.startsWith('http') ? (
                                    <i className={cn("fa", tab.image, "text-muted-foreground text-xs")} />
                                ) : null}
                                <span className="truncate">{tab.name}</span>
                              </div>
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={tab.url}>
                                {tab.url}
                              </div>
                            </div>

                            {/* Category Details */}
                            <div className="hidden md:block text-sm text-muted-foreground">
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-secondary text-secondary-foreground text-xs">
                                {getCategoryName(tab.category_id)}
                              </span>
                            </div>

                             {/* Group */}
                             <div className="hidden md:block text-sm text-muted-foreground">
                                <span className="text-xs">{getGroupName(tab.group_id)}</span>
                             </div>

                            {/* Status */}
                            <div className="flex justify-center">
                              <div className={cn(
                                "w-2.5 h-2.5 rounded-full",
                                tab.enabled ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500"
                              )} title={tab.enabled ? 'Enabled' : 'Disabled'} />
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEdit(tab)}
                                className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(tab.id)}
                                className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </>
        )}
      </div>

      <TabForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSaved={fetchData}
        categories={categories}
        groups={groups}
        tab={editingTab}
      />
    </div>
  )
}
