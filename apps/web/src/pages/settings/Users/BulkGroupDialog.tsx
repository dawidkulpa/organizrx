import { Group } from './use-users'

interface BulkGroupDialogProps {
  isOpen: boolean
  onClose: () => void
  selectedCount: number
  groups: Group[]
  bulkGroupId: number | ''
  setBulkGroupId: (id: number | '') => void
  handleBulkGroupChange: () => void
}

export function BulkGroupDialog({
  isOpen,
  onClose,
  selectedCount,
  groups,
  bulkGroupId,
  setBulkGroupId,
  handleBulkGroupChange,
}: BulkGroupDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-lg shadow-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold">Move {selectedCount} Users</h3>
        <div className="space-y-2">
          <label className="text-sm font-medium">Select New Group</label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={bulkGroupId}
            onChange={(e) => setBulkGroupId(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">Select a group...</option>
            {groups.map((g) => (
              <option key={g.id} value={g.group_id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleBulkGroupChange}
            disabled={bulkGroupId === ''}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:brightness-110 disabled:opacity-50"
          >
            Move Users
          </button>
        </div>
      </div>
    </div>
  )
}
