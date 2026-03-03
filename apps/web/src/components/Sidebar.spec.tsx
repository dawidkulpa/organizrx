import { GlobalWindow } from 'happy-dom'
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { render, waitFor, cleanup } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Setup happy-dom globals for React component testing
// ---------------------------------------------------------------------------

const happyWindow = new GlobalWindow({ url: 'http://localhost:5173' })
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
  } catch {
    // skip non-configurable
  }
}
Object.defineProperty(globalThis, 'window', {
  value: happyWindow,
  writable: true,
  configurable: true,
})

// Mock API client
const mockSidebar = mock(() =>
  Promise.resolve({
    data: { data: { tabs: [] as Array<Record<string, unknown>>, categories: [] as Array<Record<string, unknown>> } },
  })
)

mock.module('../api/client', () => ({
  default: {},
  api: {
    tabs: { sidebar: mockSidebar },
  },
}))

import { MemoryRouter } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuthStore, useUIStore } from '../store'

// ============================================================================
// Sidebar Component
// ============================================================================

describe('Sidebar', () => {
  beforeEach(() => {
    useAuthStore.getState().setToken('test-token')
    useAuthStore.getState().setUser({
      id: 1,
      username: 'admin',
      email: 'admin@test.com',
      groupName: 'Admin',
      group_id: 0,
      image: null,
    })
    useUIStore.getState().setSidebarOpen(true)
    mockSidebar.mockImplementation(() =>
      Promise.resolve({
        data: { data: { tabs: [] as Array<Record<string, unknown>>, categories: [] as Array<Record<string, unknown>> } },
      })
    )
  })

  afterEach(() => {
    cleanup()
    useAuthStore.getState().clearAuth()
    useUIStore.getState().setSidebarOpen(true)
  })

  it('should show OrganizrX brand text when sidebar is open', async () => {
    const { getByText } = render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(getByText('OrganizrX')).toBeTruthy()
    })
  })

  it('should show Dashboard nav link', async () => {
    const { getByText } = render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(getByText('Dashboard')).toBeTruthy()
    })
  })

  it('should show Settings nav link', async () => {
    const { getByText } = render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(getByText('Settings')).toBeTruthy()
    })
  })

  it('should show Users nav link for admin users', async () => {
    useAuthStore.getState().setUser({
      id: 1,
      username: 'admin',
      email: 'admin@test.com',
      groupName: 'Admin',
      group_id: 0,
      image: null,
    })

    const { getByText } = render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(getByText('Users')).toBeTruthy()
    })
  })

  it('should render tabs from API response', async () => {
    mockSidebar.mockImplementation(() =>
      Promise.resolve({
        data: {
          data: {
            tabs: [
              {
                id: 1,
                order: 1,
                category_id: 0,
                name: 'Sonarr',
                url: 'http://sonarr:8989',
                url_local: null,
                enabled: 1,
                group_id: 0,
                image: null,
                type: 0,
              },
              {
                id: 2,
                order: 2,
                category_id: 0,
                name: 'Radarr',
                url: 'http://radarr:7878',
                url_local: null,
                enabled: 1,
                group_id: 0,
                image: null,
                type: 0,
              },
            ],
            categories: [],
          },
        },
      })
    )

    const { getByText } = render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(getByText('Sonarr')).toBeTruthy()
      expect(getByText('Radarr')).toBeTruthy()
    })
  })

  it('should show loading spinner while fetching sidebar data', async () => {
    mockSidebar.mockImplementation(
      () =>
        new Promise(() => {
          // Never resolves, simulating loading state
        })
    )

    const { container } = render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    await waitFor(() => {
      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeTruthy()
    })
  })
})
