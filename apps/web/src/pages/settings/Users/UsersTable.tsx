import { Pencil, Trash2, Mail, Lock, Check } from 'lucide-react'
import { cn } from '../../../utils'
import { User } from './use-users'

interface UsersTableProps {
  filteredUsers: User[]
  selectedUsers: number[]
  handleSelectAll: () => void
  handleSelectUser: (id: number) => void
  getGroupName: (id: number) => string
  handleEdit: (user: User) => void
  handleDelete: (user: User) => void
}

export function UsersTable({
  filteredUsers,
  selectedUsers,
  handleSelectAll,
  handleSelectUser,
  getGroupName,
  handleEdit,
  handleDelete,
}: UsersTableProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <div className="hidden md:block rounded-md border border-border overflow-hidden">
      <table className="w-full caption-bottom text-sm text-left">
        <thead className="[&_tr]:border-b">
          <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
            <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-[50px]">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                onChange={handleSelectAll}
              />
            </th>
            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">User</th>
            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Group</th>
            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Joined</th>
            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Method</th>
            <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {filteredUsers.map((user) => (
            <tr
              key={user.id}
              className={cn(
                'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
                user.locked === 1 && 'bg-destructive/5 hover:bg-destructive/10'
              )}
            >
              <td className="p-4 align-middle">
                <input
                  type="checkbox"
                                     className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => handleSelectUser(user.id)}
                />
              </td>
              <td className="p-4 align-middle">
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">{user.username}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {user.email || 'No email'}
                  </span>
                </div>
              </td>
              <td className="p-4 align-middle">
                <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-semibold text-foreground shadow-sm">
                  {getGroupName(user.group_id)}
                </span>
              </td>
              <td className="p-4 align-middle text-muted-foreground">
                {formatDate(user.register_date)}
              </td>
              <td className="p-4 align-middle">
                {user.locked === 1 ? (
                  <span className="inline-flex items-center text-xs font-medium text-destructive gap-1">
                    <Lock className="h-3 w-3" /> Locked
                  </span>
                ) : (
                   <span className="inline-flex items-center text-xs font-medium text-success gap-1">
                     <Check className="h-3 w-3" /> Active
                   </span>
                 )}
              </td>
              <td className="p-4 align-middle">
                {user.auth_service && (
                  <span className="uppercase text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                    {user.auth_service}
                  </span>
                )}
              </td>
              <td className="p-4 align-middle text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleEdit(user)}
                    aria-label="Edit user"
                    className="p-2 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(user)}
                    aria-label="Delete user"
                    className="p-2 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
