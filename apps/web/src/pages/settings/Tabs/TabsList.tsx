import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd'
import { LayoutGrid } from 'lucide-react'
import { Tab } from './use-tabs'
import { TabRow } from './TabRow'

interface TabsListProps {
  filteredTabs: Tab[]
  selectedTabs: number[]
  handleDragEnd: (result: DropResult) => void
  toggleSelectAll: () => void
  toggleSelection: (id: number) => void
  getCategoryName: (id: number | null) => string
  getGroupName: (id: number) => string
  handleEdit: (tab: Tab) => void
  handleDelete: (id: number) => void
  searchQuery: string
  selectedCategory: string
}

export function TabsList({
  filteredTabs,
  selectedTabs,
  handleDragEnd,
  toggleSelectAll,
  toggleSelection,
  getCategoryName,
  getGroupName,
  handleEdit,
  handleDelete,
  searchQuery,
  selectedCategory,
}: TabsListProps) {
  if (filteredTabs.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm p-12 text-center text-muted-foreground">
        <LayoutGrid className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <h3 className="text-lg font-medium text-foreground">No tabs found</h3>
        <p>Try adjusting your filters or add a new tab.</p>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
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
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="divide-y divide-border"
            >
              {filteredTabs.map((tab, index) => (
                <TabRow
                  key={tab.id}
                  tab={tab}
                  index={index}
                  isDragDisabled={searchQuery !== '' || selectedCategory !== 'all'}
                  isSelected={selectedTabs.includes(tab.id)}
                  toggleSelection={toggleSelection}
                  getCategoryName={getCategoryName}
                  getGroupName={getGroupName}
                  handleEdit={handleEdit}
                  handleDelete={handleDelete}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  )
}
