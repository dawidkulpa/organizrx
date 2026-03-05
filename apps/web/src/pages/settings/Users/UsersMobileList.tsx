import { Calendar, Lock, Pencil, Trash2 } from 'lucide-react'
import { cn } from '../../../utils'
import { User } from './use-users'

interface UsersMobileListProps {
  filteredUsers: User[]
  selectedUsers: number[]
  handleSelectUser: (id: number) => void
  getGroupName: (id: number) => string
  handleEdit: (user: User) => void
  handleDelete: (user: User) => void
}

export function UsersMobileList({
  filteredUsers,
  selectedUsers,
  handleSelectUser,
  getGroupName,
  handleEdit,
  handleDelete,
}: UsersMobileListProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <div className="grid gap-4 md:hidden">
      {filteredUsers.map((user) => (
        <div
          key={user.id}
          className={cn(
            'flex items-start justify-between p-4 rounded-lg border border-border bg-card shadow-sm',
            user.locked === 1 && 'border-l-4 border-l-destructive'
          )}
        >
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              checked={selectedUsers.includes(user.id)}
              onChange={() => handleSelectUser(user.id)}
            />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-foreground">{user.username}</h4>
                {user.locked === 1 && <Lock className="h-3 w-3 text-destructive" />}
              </div>
              <div className="text-sm text-muted-foreground mb-2">{user.email || 'No email'}</div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 font-medium">
                  {getGroupName(user.group_id)}
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3 w-3" /> {formatDate(user.register_date)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => handleEdit(user)}
              className="p-2 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(user)}
              className="p-2 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
