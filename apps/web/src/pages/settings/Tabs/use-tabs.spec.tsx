import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { renderHook, act } from '@testing-library/react'
import { useTabs } from './use-tabs'

// Mock the API client
const apiMock = {
  tabs: {
    getAll: mock(() =>
      Promise.resolve({
        data: {
          data: [
            { id: 1, isDefault: 1, name: 'Def', url: 'http://def', order: 0, category_id: null },
            { id: 2, isDefault: 0, name: 'Cust', url: 'http://cust', order: 1, category_id: null },
          ],
        },
      })
    ),
    reorder: mock(() => Promise.resolve()),
    update: mock(() => Promise.resolve()),
    create: mock(() => Promise.resolve()),
    getById: mock(() => Promise.resolve()),
    sidebar: mock(() => Promise.resolve()),
    checkUrl: mock(() => Promise.resolve()),
    listAdmin: mock(() =>
      Promise.resolve([
        { id: 1, isDefault: 1, name: 'Def' },
        { id: 2, isDefault: 0, name: 'Cust' },
      ])
    ),
    delete: mock(() => Promise.resolve()),
  },
  categories: {
    getAll: mock(() => Promise.resolve({ data: { data: [] } })),
    list: mock(() => Promise.resolve([])),
  },
  groups: {
    getAll: mock(() => Promise.resolve({ data: { data: [] } })),
    list: mock(() => Promise.resolve([])),
  },
}

mock.module('../../../api/client', () => ({
  api: apiMock,
}))

describe('useTabs Hook', () => {
  beforeEach(() => {
    apiMock.tabs.delete.mockClear()
    apiMock.tabs.getAll.mockClear()
  })

  it('allows selecting default tabs', async () => {
    const { result } = renderHook(() => useTabs())

    // Wait for the initial load
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    // Initially nothing selected
    expect(result.current.selectedTabs).toEqual([])

    // Select default tab (id: 1)
    act(() => {
      result.current.toggleSelection(1)
    })

    expect(result.current.selectedTabs).toEqual([1])

    // Select custom tab (id: 2)
    act(() => {
      result.current.toggleSelection(2)
    })

    expect(result.current.selectedTabs).toEqual([1, 2])
  })

  it('prevents bulk deletion of default tabs', async () => {
    // Mock confirm dialog
    const originalConfirm = globalThis.confirm
    globalThis.confirm = () => true

    const { result } = renderHook(() => useTabs())

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    // Select both
    act(() => {
      result.current.toggleSelection(1)
      result.current.toggleSelection(2)
    })

    await act(async () => {
      await result.current.handleBulkDelete()
    })

    // Should only call delete for id 2
    expect(apiMock.tabs.delete).toHaveBeenCalledTimes(1)
    expect(apiMock.tabs.delete).toHaveBeenCalledWith(2)

    globalThis.confirm = originalConfirm
  })
})
