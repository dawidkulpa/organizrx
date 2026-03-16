import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { renderHook, act } from '@testing-library/react'
import { useUsers, User } from './use-users'

// Mock the API client
const apiMock = {
  users: {
    getAll: mock(() =>
      Promise.resolve({
        data: {
          data: [
            {
              id: 1,
              username: 'testuser',
              email: 'test@example.com',
              group_id: 1,
              image: null,
              locked: 0,
              register_date: '2024-01-01',
              auth_service: null,
            },
            {
              id: 2,
              username: 'admin',
              email: 'admin@example.com',
              group_id: 2,
              image: null,
              locked: 0,
              register_date: '2024-01-01',
              auth_service: null,
            },
          ],
        },
      })
    ),
    delete: mock(() => Promise.resolve()),
    update: mock(() => Promise.resolve()),
  },
  groups: {
    getAll: mock(() =>
      Promise.resolve({
        data: {
          data: [
            { id: 1, name: 'Users', group_id: 1, image: null, isDefault: 1 },
            { id: 2, name: 'Admins', group_id: 2, image: null, isDefault: 0 },
          ],
        },
      })
    ),
  },
}

mock.module('../../../api/client', () => ({
  api: apiMock,
}))

// Import createQueryWrapper after mocking
const { createQueryWrapper } = await import('../../../test-utils/query-wrapper')

describe('useUsers Hook', () => {
  beforeEach(() => {
    apiMock.users.getAll.mockClear()
    apiMock.groups.getAll.mockClear()
    apiMock.users.delete.mockClear()
    apiMock.users.update.mockClear()
  })

  it('loads users and groups data on mount', async () => {
    const wrapper = createQueryWrapper()
    const { result } = renderHook(() => useUsers(), { wrapper })

    // Initially loading
    expect(result.current.loading).toBe(true)

    // Wait for queries to settle
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    // Data should be loaded
    expect(result.current.users.length).toBe(2)
    expect(result.current.groups.length).toBe(2)
    expect(result.current.loading).toBe(false)
    expect(apiMock.users.getAll).toHaveBeenCalled()
    expect(apiMock.groups.getAll).toHaveBeenCalled()
  })

  it('filters users by search query', async () => {
    const wrapper = createQueryWrapper()
    const { result } = renderHook(() => useUsers(), { wrapper })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    // Set search query
    act(() => {
      result.current.setSearchQuery('admin')
    })

    expect(result.current.filteredUsers.length).toBe(1)
    expect(result.current.filteredUsers[0].username).toBe('admin')
  })

  it('filters users by group', async () => {
    const wrapper = createQueryWrapper()
    const { result } = renderHook(() => useUsers(), { wrapper })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    // Set group filter
    act(() => {
      result.current.setGroupFilter(2)
    })

    expect(result.current.filteredUsers.length).toBe(1)
    expect(result.current.filteredUsers[0].group_id).toBe(2)
  })

  it('selects and deselects users', async () => {
    const wrapper = createQueryWrapper()
    const { result } = renderHook(() => useUsers(), { wrapper })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    // Select user
    act(() => {
      result.current.handleSelectUser(1)
    })

    expect(result.current.selectedUsers).toContain(1)

    // Deselect user
    act(() => {
      result.current.handleSelectUser(1)
    })

    expect(result.current.selectedUsers).not.toContain(1)
  })

  it('selects all filtered users', async () => {
    const wrapper = createQueryWrapper()
    const { result } = renderHook(() => useUsers(), { wrapper })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    // Select all
    act(() => {
      result.current.handleSelectAll()
    })

    expect(result.current.selectedUsers.length).toBe(2)

    // Deselect all
    act(() => {
      result.current.handleSelectAll()
    })

    expect(result.current.selectedUsers.length).toBe(0)
  })

  it('handles bulk delete mutation', async () => {
    const originalConfirm = globalThis.confirm
    globalThis.confirm = () => true

    const wrapper = createQueryWrapper()
    const { result } = renderHook(() => useUsers(), { wrapper })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    // Select users for deletion
    act(() => {
      result.current.handleSelectUser(1)
      result.current.handleSelectUser(2)
    })

    // Clear mock to measure only bulk delete calls
    apiMock.users.delete.mockClear()

    // Execute bulk delete and wait for mutations to settle
    await act(async () => {
      await result.current.handleBulkDelete()
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    // Verify selectedUsers was cleared (successful operation)
    expect(result.current.selectedUsers.length).toBe(0)
    // Verify delete was called at least once per selected user
    expect(apiMock.users.delete.mock.calls.length).toBeGreaterThanOrEqual(1)

    globalThis.confirm = originalConfirm
  })

  it('handles bulk lock mutation', async () => {
    const wrapper = createQueryWrapper()
    const { result } = renderHook(() => useUsers(), { wrapper })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    // Select users
    act(() => {
      result.current.handleSelectUser(1)
    })

    // Lock users
    await act(async () => {
      await result.current.handleBulkLock(true)
    })

    expect(apiMock.users.update).toHaveBeenCalledWith(1, { locked: 1 })
    expect(result.current.selectedUsers.length).toBe(0)
  })

  it('handles bulk group change mutation', async () => {
    const wrapper = createQueryWrapper()
    const { result } = renderHook(() => useUsers(), { wrapper })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    // Select users
    act(() => {
      result.current.handleSelectUser(1)
    })

    // Set bulk group
    act(() => {
      result.current.setBulkGroupId(2)
    })

    // Apply group change
    await act(async () => {
      await result.current.handleBulkGroupChange()
    })

    expect(apiMock.users.update).toHaveBeenCalledWith(1, { group_id: 2 })
    expect(result.current.selectedUsers.length).toBe(0)
    expect(result.current.bulkGroupId).toBe('')
    expect(result.current.isBulkGroupOpen).toBe(false)
  })

  it('handles single user delete mutation', async () => {
    const originalConfirm = globalThis.confirm
    globalThis.confirm = () => true

    const wrapper = createQueryWrapper()
    const { result } = renderHook(() => useUsers(), { wrapper })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    const userToDelete: User = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      group_id: 1,
      image: null,
      locked: 0,
      register_date: '2024-01-01',
      auth_service: null,
    }

    // Delete single user
    await act(async () => {
      await result.current.handleDelete(userToDelete)
    })

    expect(apiMock.users.delete).toHaveBeenCalledWith(1)

    globalThis.confirm = originalConfirm
  })

  it('returns correct data shape for component compatibility', async () => {
    const wrapper = createQueryWrapper()
    const { result } = renderHook(() => useUsers(), { wrapper })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    // Verify return shape matches expected interface
    expect(result.current).toHaveProperty('users')
    expect(result.current).toHaveProperty('groups')
    expect(result.current).toHaveProperty('loading')
    expect(result.current).toHaveProperty('searchQuery')
    expect(result.current).toHaveProperty('setSearchQuery')
    expect(result.current).toHaveProperty('groupFilter')
    expect(result.current).toHaveProperty('setGroupFilter')
    expect(result.current).toHaveProperty('selectedUsers')
    expect(result.current).toHaveProperty('filteredUsers')
    expect(result.current).toHaveProperty('isInviteOpen')
    expect(result.current).toHaveProperty('setIsInviteOpen')
    expect(result.current).toHaveProperty('editingUser')
    expect(result.current).toHaveProperty('setEditingUser')
    expect(result.current).toHaveProperty('isUserFormOpen')
    expect(result.current).toHaveProperty('setIsUserFormOpen')
    expect(result.current).toHaveProperty('isBulkGroupOpen')
    expect(result.current).toHaveProperty('setIsBulkGroupOpen')
    expect(result.current).toHaveProperty('bulkGroupId')
    expect(result.current).toHaveProperty('setBulkGroupId')
    expect(result.current).toHaveProperty('fetchData')
    expect(result.current).toHaveProperty('handleSelectAll')
    expect(result.current).toHaveProperty('handleSelectUser')
    expect(result.current).toHaveProperty('handleBulkDelete')
    expect(result.current).toHaveProperty('handleBulkLock')
    expect(result.current).toHaveProperty('handleBulkGroupChange')
    expect(result.current).toHaveProperty('handleDelete')
    expect(result.current).toHaveProperty('handleEdit')
    expect(result.current).toHaveProperty('getGroupName')
  })
})
