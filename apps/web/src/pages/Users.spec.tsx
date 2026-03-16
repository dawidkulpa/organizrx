import { GlobalWindow } from 'happy-dom'
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, render, waitFor } from '@testing-library/react'
import { createQueryWrapper } from '../test-utils/query-wrapper'

const happyWindow = new GlobalWindow({ url: 'http://localhost:5173/users' })
const domGlobals = [
  'document',
  'navigator',
  'location',
  'history',
  'localStorage',
  'sessionStorage',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'MutationObserver',
  'DOMParser',
  'XMLSerializer',
  'HTMLElement',
  'HTMLDivElement',
  'HTMLButtonElement',
  'HTMLInputElement',
  'HTMLFormElement',
  'HTMLAnchorElement',
  'HTMLSelectElement',
  'DocumentFragment',
  'Element',
  'Node',
  'Text',
  'Comment',
  'Event',
  'CustomEvent',
  'MouseEvent',
  'KeyboardEvent',
]

for (const key of Object.getOwnPropertyNames(happyWindow)) {
  if (key === 'undefined' || key === 'NaN' || key === 'Infinity') continue
  if (key in globalThis && !domGlobals.includes(key)) continue

  try {
    const desc = Object.getOwnPropertyDescriptor(happyWindow, key)
    if (desc) Object.defineProperty(globalThis, key, { ...desc, configurable: true })
  } catch {}
}

Object.defineProperty(globalThis, 'window', {
  value: happyWindow,
  writable: true,
  configurable: true,
})

Object.defineProperty(globalThis, 'confirm', {
  value: () => true,
  writable: true,
  configurable: true,
})

const mockGetAllUsers = mock(() =>
  Promise.resolve({
    data: {
      data: {
        users: [
          {
            id: 1,
            username: 'realadmin',
            email: 'admin@test.com',
            group_id: 0,
            image: null,
            locked: 0,
            register_date: '2026-03-01T12:00:00.000Z',
            auth_service: 'internal',
          },
        ],
        meta: { page: 1, limit: 20, total: 1, pages: 1 },
      },
    },
  })
)

const mockGetAllGroups = mock(() =>
  Promise.resolve({
    data: {
      data: {
        groups: [
          { id: 1, name: 'Admin', group_id: 0, image: null, isDefault: 1 },
          { id: 2, name: 'User', group_id: 4, image: null, isDefault: 1 },
        ],
      },
    },
  })
)

mock.module('../api/client', () => ({
  default: {},
  api: {
    users: {
      getAll: mockGetAllUsers,
      update: mock(() => Promise.resolve({ data: { data: { user: null } } })),
      delete: mock(() => Promise.resolve({ data: { data: { success: true } } })),
    },
    groups: {
      getAll: mockGetAllGroups,
    },
    invites: {
      getAll: mock(() => Promise.resolve({ data: { data: [] } })),
      create: mock(() => Promise.resolve({ data: { data: { code: 'invite-code' } } })),
      delete: mock(() => Promise.resolve({ data: { data: { success: true } } })),
    },
  },
}))

import Users from './Users'

describe('Users page', () => {
  beforeEach(() => {
    mockGetAllUsers.mockClear()
    mockGetAllGroups.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders live API users instead of hardcoded placeholder data', async () => {
    const { getAllByText, queryByText } = render(<Users />, { wrapper: createQueryWrapper() })

    await waitFor(() => {
      expect(getAllByText('realadmin').length).toBeGreaterThan(0)
    })

    expect(getAllByText('admin@test.com').length).toBeGreaterThan(0)
    expect(getAllByText('Admin').length).toBeGreaterThan(0)
    expect(queryByText('Alice Cooper')).toBeNull()
    expect(mockGetAllUsers).toHaveBeenCalledTimes(1)
    expect(mockGetAllGroups).toHaveBeenCalledTimes(1)
  })
})
