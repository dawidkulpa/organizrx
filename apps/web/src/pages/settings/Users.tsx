import { useEffect, useState, useMemo } from 'react'
import { api } from '../../api/client'
import { cn } from '../../utils'
import { toast } from 'sonner'
import {
  Users as UsersIcon,
  Search,
  Filter,
  Pencil,
  Trash2,
  Lock,
  Unlock,
  UserPlus,
  Check,
  Mail,
  Calendar
} from 'lucide-react'
import UserForm from '../../components/UserForm'
import InviteDialog from '../../components/InviteDialog'

interface User {
  id: number
  username: string
  email: string | null
  group_id: number
  image: string | null
  locked: number
  register_date: string | null
  auth_service: string | null
}

interface Group {
  id: number
  name: string
  group_id: number
  image: string | null
  isDefault: number | null
}
export default function SettingsUsers() {
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

  const fetchData = async () => {
    try {
      setLoading(true)
      const [usersRes, groupsRes] = await Promise.all([
        api.users.getAll(),
        api.groups.getAll()
      ])
      const userData = usersRes.data.data
      setUsers(Array.isArray(userData) ? userData : (userData as { users: User[] }).users || [])
      const groupData = groupsRes.data.data
      setGroups(Array.isArray(groupData) ? groupData : (groupData as { groups: Group[] }).groups || [])
    } catch (error) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesGroup = groupFilter === 'all' || user.group_id === groupFilter

      return matchesSearch && matchesGroup
    })
  }, [users, searchQuery, groupFilter])

  // Bulk Actions
  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id))
    }
  }

  const handleSelectUser = (id: number) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter(uid => uid !== id))
    } else {
      setSelectedUsers([...selectedUsers, id])
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedUsers.length} users?`)) return
    
    try {
      await Promise.all(selectedUsers.map(id => api.users.delete(id)))
      toast.success('Users deleted')
      fetchData()
      setSelectedUsers([])
    } catch (error) {
      toast.error('Failed to delete some users')
    }
  }

  const handleBulkLock = async (locked: boolean) => {
    try {
      await Promise.all(selectedUsers.map(id => api.users.update(id, { locked: locked ? 1 : 0 })))
      toast.success(locked ? 'Users locked' : 'Users unlocked')
      fetchData()
      setSelectedUsers([])
    } catch (error) {
      toast.error('Failed to update users')
    }
  }

  const handleBulkGroupChange = async () => {
    if (!bulkGroupId) return
    try {
      await Promise.all(selectedUsers.map(id => api.users.update(id, { group_id: bulkGroupId })))
      toast.success('Group updated for selected users')
      fetchData()
      setSelectedUsers([])
      setIsBulkGroupOpen(false)
      setBulkGroupId('')
    } catch (error) {
      toast.error('Failed to update groups')
    }
  }

  // Single Actions
  const handleDelete = async (user: User) => {
    if (!confirm(`Are you sure you want to delete user ${user.username}? This action cannot be undone.`)) return
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
    return groups.find(g => g.group_id === groupId)?.name || 'Unknown'
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-foreground">Users</h3>
          <p className="text-sm text-muted-foreground">
            Manage user accounts, roles, and access.
          </p>
        </div>
        <button
          onClick={() => setIsInviteOpen(true)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm hover:shadow-md"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Generate Invite
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-lg border border-border shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users..."
              className="flex h-9 w-full rounded-md border border-input bg-background pl-9 px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            className="flex h-9 w-full sm:w-[180px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          >
            <option value="all">All Groups</option>
            {groups.map(g => (
              <option key={g.id} value={g.group_id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedUsers.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border border-border animate-in fade-in slide-in-from-top-2">
          <span className="text-sm font-medium px-2">{selectedUsers.length} selected</span>
          <div className="h-4 w-[1px] bg-border mx-1" />
          <button onClick={() => handleBulkLock(true)} className="p-2 hover:bg-background rounded-md text-muted-foreground hover:text-foreground" title="Lock Selected">
            <Lock className="h-4 w-4" />
          </button>
          <button onClick={() => handleBulkLock(false)} className="p-2 hover:bg-background rounded-md text-muted-foreground hover:text-foreground" title="Unlock Selected">
            <Unlock className="h-4 w-4" />
          </button>
          <button onClick={() => setIsBulkGroupOpen(true)} className="p-2 hover:bg-background rounded-md text-muted-foreground hover:text-foreground" title="Change Group">
            <UsersIcon className="h-4 w-4" />
          </button>
          <div className="h-4 w-[1px] bg-border mx-1" />
          <button onClick={handleBulkDelete} className="p-2 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive" title="Delete Selected">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading ? (
         <div className="space-y-3">
           {[1, 2, 3, 4, 5].map((i) => (
             <div key={i} className="h-16 bg-muted/40 rounded-lg animate-pulse" />
           ))}
         </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-medium text-foreground">No users found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-md border border-border overflow-hidden">
            <table className="w-full caption-bottom text-sm text-left">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-[50px]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="h-12 px-4 align-middle font-medium text-muted-foreground">User</th>
                  <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Group</th>
                  <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Joined</th>
                  <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                  <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Method</th>
                  <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={cn(
                      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
                      user.locked === 1 && "bg-destructive/5 hover:bg-destructive/10"
                    )}
                  >
                    <td className="p-4 align-middle">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
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
                        <span className="inline-flex items-center text-xs font-medium text-green-600 gap-1">
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
                          className="p-2 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
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

          {/* Mobile Cards */}
          <div className="grid gap-4 md:hidden">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className={cn(
                  "flex items-start justify-between p-4 rounded-lg border border-border bg-card shadow-sm",
                  user.locked === 1 && "border-l-4 border-l-destructive"
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
        </>
      )}

      <InviteDialog open={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
      
      {editingUser && (
        <UserForm
          user={editingUser}
          groups={groups}
          open={isUserFormOpen}
          onClose={() => {
            setIsUserFormOpen(false)
            setEditingUser(null)
          }}
          onSaved={fetchData}
        />
      )}

      {/* Bulk Group Dialog */}
      {isBulkGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-card border border-border rounded-lg shadow-xl p-6 space-y-4">
             <h3 className="text-lg font-semibold">Move {selectedUsers.length} Users</h3>
             <div className="space-y-2">
                <label className="text-sm font-medium">Select New Group</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={bulkGroupId}
                  onChange={(e) => setBulkGroupId(Number(e.target.value))}
                >
                  <option value="">Select a group...</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.group_id}>{g.name}</option>
                  ))}
                </select>
             </div>
             <div className="flex justify-end gap-2">
                <button 
                  onClick={() => setIsBulkGroupOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkGroupChange}
                  disabled={!bulkGroupId}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:brightness-110 disabled:opacity-50"
                >
                  Move Users
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
