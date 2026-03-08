import { Users as UsersIcon, Search, Filter, Lock, Unlock, UserPlus, Trash2 } from 'lucide-react'
import UserForm from '../../../components/UserForm'
import InviteDialog from '../../../components/InviteDialog'
import { useUsers } from './use-users'
import { UsersTable } from './UsersTable'
import { UsersMobileList } from './UsersMobileList'
import { BulkGroupDialog } from './BulkGroupDialog'
import { EmptyState } from '../../../components/EmptyState'

export default function SettingsUsers() {
  const {
    groups,
    loading,
    searchQuery,
    setSearchQuery,
    groupFilter,
    setGroupFilter,
    selectedUsers,
    filteredUsers,
    isInviteOpen,
    setIsInviteOpen,
    editingUser,
    setEditingUser,
    isUserFormOpen,
    setIsUserFormOpen,
    isBulkGroupOpen,
    setIsBulkGroupOpen,
    bulkGroupId,
    setBulkGroupId,
    fetchData,
    handleSelectAll,
    handleSelectUser,
    handleBulkDelete,
    handleBulkLock,
    handleBulkGroupChange,
    handleDelete,
    handleEdit,
    getGroupName,
  } = useUsers()

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-foreground">Users</h3>
          <p className="text-sm text-muted-foreground">Manage user accounts, roles, and access.</p>
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
            onChange={(e) =>
              setGroupFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
          >
            <option value="all">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.group_id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedUsers.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border border-border animate-in fade-in slide-in-from-top-2">
          <span className="text-sm font-medium px-2">{selectedUsers.length} selected</span>
          <div className="h-4 w-[1px] bg-border mx-1" />
          <button
            onClick={() => handleBulkLock(true)}
            className="p-2 hover:bg-background rounded-md text-muted-foreground hover:text-foreground"
            title="Lock Selected"
          >
            <Lock className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleBulkLock(false)}
            className="p-2 hover:bg-background rounded-md text-muted-foreground hover:text-foreground"
            title="Unlock Selected"
          >
            <Unlock className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsBulkGroupOpen(true)}
            className="p-2 hover:bg-background rounded-md text-muted-foreground hover:text-foreground"
            title="Change Group"
          >
            <UsersIcon className="h-4 w-4" />
          </button>
          <div className="h-4 w-[1px] bg-border mx-1" />
          <button
            onClick={handleBulkDelete}
            className="p-2 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive"
            title="Delete Selected"
          >
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
        <EmptyState
          message="No additional users. Click Invite to add team members."
          actionLabel="Invite"
          onAction={() => setIsInviteOpen(true)}
        />
      ) : (
        <>
          <UsersTable
            filteredUsers={filteredUsers}
            selectedUsers={selectedUsers}
            handleSelectAll={handleSelectAll}
            handleSelectUser={handleSelectUser}
            getGroupName={getGroupName}
            handleEdit={handleEdit}
            handleDelete={handleDelete}
          />

          <UsersMobileList
            filteredUsers={filteredUsers}
            selectedUsers={selectedUsers}
            handleSelectUser={handleSelectUser}
            getGroupName={getGroupName}
            handleEdit={handleEdit}
            handleDelete={handleDelete}
          />
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

      <BulkGroupDialog
        isOpen={isBulkGroupOpen}
        onClose={() => setIsBulkGroupOpen(false)}
        selectedCount={selectedUsers.length}
        groups={groups}
        bulkGroupId={bulkGroupId}
        setBulkGroupId={setBulkGroupId}
        handleBulkGroupChange={handleBulkGroupChange}
      />
    </div>
  )
}
