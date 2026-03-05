import { Draggable } from '@hello-pangea/dnd'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import { cn } from '../../../utils'
import { Tab } from './use-tabs'

interface TabRowProps {
  tab: Tab
  index: number
  isDragDisabled: boolean
  isSelected: boolean
  toggleSelection: (id: number) => void
  getCategoryName: (id: number | null) => string
  getGroupName: (id: number) => string
  handleEdit: (tab: Tab) => void
  handleDelete: (id: number) => void
}

export function TabRow({
  tab,
  index,
  isDragDisabled,
  isSelected,
  toggleSelection,
  getCategoryName,
  getGroupName,
  handleEdit,
  handleDelete,
}: TabRowProps) {
  return (
    <Draggable
      key={tab.id}
      draggableId={String(tab.id)}
      index={index}
      isDragDisabled={isDragDisabled}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            'grid grid-cols-[auto_1fr_1fr_1fr_auto_auto] gap-4 p-4 items-center group transition-colors',
            snapshot.isDragging ? 'bg-accent shadow-lg z-10' : 'hover:bg-muted/50',
            isSelected && 'bg-muted/30'
          )}
        >
          {/* Drag Handle & Checkbox */}
          <div className="flex items-center gap-3">
            <div
              {...provided.dragHandleProps}
              className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-foreground"
            >
              <GripVertical className="w-5 h-5" />
            </div>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelection(tab.id)}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
          </div>

          {/* Name & URL */}
          <div className="min-w-0">
            <div className="font-medium text-foreground flex items-center gap-2">
              {tab.image && !tab.image.startsWith('fa-') && !tab.image.startsWith('http') ? (
                <i className={cn('fa', tab.image, 'text-muted-foreground text-xs')} />
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
            <div
              className={cn(
                'w-2.5 h-2.5 rounded-full',
                tab.enabled ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'
              )}
              title={tab.enabled ? 'Enabled' : 'Disabled'}
            />
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
  )
}
