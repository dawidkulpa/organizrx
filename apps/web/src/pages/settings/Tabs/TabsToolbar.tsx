import { Search, Filter, Trash2, Plus } from 'lucide-react'
import { Category } from './use-tabs'

interface TabsToolbarProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  categories: Category[]
  selectedTabsCount: number
  handleBulkDelete: () => void
  onAddTab: () => void
}

export function TabsToolbar({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  categories,
  selectedTabsCount,
  handleBulkDelete,
  onAddTab,
}: TabsToolbarProps) {
  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tab Management</h1>
          <p className="text-muted-foreground">Manage your dashboard tabs and navigation links.</p>
        </div>
        <button
          onClick={onAddTab}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Tab
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
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
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedTabsCount > 0 && (
          <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-200">
            <span className="text-sm font-medium text-muted-foreground mr-2">
              {selectedTabsCount} selected
            </span>
            <button
              onClick={handleBulkDelete}
              aria-label="Delete selected tabs"
              className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              title="Delete Selected"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  )
}
