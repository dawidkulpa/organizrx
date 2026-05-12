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
    data: {
      data: {
        tabs: [] as Array<Record<string, unknown>>,
        categories: [] as Array<Record<string, unknown>>,
      },
    },
  })
)
const mockCheckUrl = mock(() =>
  Promise.resolve({ data: { data: { reachable: true, iframeAllowed: true, status: 200 } } })
)

mock.module('../api/client', () => ({
  default: {},
  api: {
    tabs: {
      sidebar: mockSidebar,
      checkUrl: mockCheckUrl,
    },
  },
}))

import { MemoryRouter } from 'react-router-dom'
import Sidebar from './Sidebar'
import TabViewport from './TabViewport'
import { createQueryWrapper } from '../test-utils/query-wrapper'
import { useAuthStore, useUIStore, useTabStore } from '../store'

const Wrapper = createQueryWrapper()

// ============================================================================
// Sidebar Component
// ============================================================================

describe('Sidebar', () => {
  beforeEach(() => {
    mockSidebar.mockClear()
    mockCheckUrl.mockClear()
    useTabStore.getState().resetTabs()
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
        data: {
          data: {
            tabs: [] as Array<Record<string, unknown>>,
            categories: [] as Array<Record<string, unknown>>,
          },
        },
      })
    )
    mockCheckUrl.mockImplementation(() =>
      Promise.resolve({ data: { data: { reachable: true, iframeAllowed: true, status: 200 } } })
    )
  })

  afterEach(() => {
    cleanup()
    useTabStore.getState().resetTabs()
    useAuthStore.getState().clearAuth()
    useUIStore.getState().setSidebarOpen(true)
  })

  it('should show OrganizrX brand text when sidebar is open', async () => {
    const { getByText } = render(
      <Wrapper>
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      </Wrapper>
    )

    await waitFor(() => {
      expect(getByText('OrganizrX')).toBeTruthy()
    })
  })

  it('should show Dashboard nav link', async () => {
    mockSidebar.mockImplementation(() =>
      Promise.resolve({
        data: {
          data: {
            tabs: [
              {
                id: 1,
                order: 0,
                category_id: null,
                name: 'Dashboard',
                url: '/',
                url_local: null,
                enabled: 1,
                group_id: 999,
                image: 'fa-home',
                type: 1,
                isDefault: 1,
              },
            ],
            categories: [],
          },
        },
      })
    )

    const { getByText } = render(
      <Wrapper>
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      </Wrapper>
    )

    await waitFor(() => {
      expect(getByText('Dashboard')).toBeTruthy()
    })
  })

  it('should show Settings nav link', async () => {
    mockSidebar.mockImplementation(() =>
      Promise.resolve({
        data: {
          data: {
            tabs: [
              {
                id: 2,
                order: 1,
                category_id: null,
                name: 'Settings',
                url: '/settings',
                url_local: null,
                enabled: 1,
                group_id: 0,
                image: 'fa-cog',
                type: 1,
                isDefault: 1,
              },
            ],
            categories: [],
          },
        },
      })
    )

    const { getByText } = render(
      <Wrapper>
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      </Wrapper>
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

    mockSidebar.mockImplementation(() =>
      Promise.resolve({
        data: {
          data: {
            tabs: [
              {
                id: 3,
                order: 2,
                category_id: null,
                name: 'Users',
                url: '/users',
                url_local: null,
                enabled: 1,
                group_id: 0,
                image: 'fa-users',
                type: 1,
                isDefault: 1,
              },
            ],
            categories: [],
          },
        },
      })
    )

    const { getByText } = render(
      <Wrapper>
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      </Wrapper>
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
      <Wrapper>
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      </Wrapper>
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
      <Wrapper>
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      </Wrapper>
    )

    await waitFor(() => {
      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeTruthy()
    })
  })

  it('shows green ping dot for reachable iframe-allowed tab', async () => {
    mockSidebar.mockImplementation(() =>
      Promise.resolve({
        data: {
          data: {
            tabs: [
              {
                id: 1,
                order: 1,
                category_id: 0,
                name: 'Plex',
                url: 'http://plex:32400',
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

    const { findByTestId } = render(
      <Wrapper>
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      </Wrapper>
    )

    const dot = await findByTestId('ping-dot-1')
    await waitFor(() => {
      expect(dot.className).toContain('bg-success')
    })
  })

  it('shares sidebar query cache with TabViewport via a single query key', async () => {
    useTabStore.getState().setActiveTabId(501)
    mockSidebar.mockImplementation(() =>
      Promise.resolve({
        data: {
          data: {
            tabs: [
              {
                id: 501,
                order: 1,
                category_id: 0,
                name: 'Shared Cache Tab',
                url: 'https://shared-cache.example',
                url_local: null,
                enabled: 1,
                group_id: 0,
                image: null,
                type: 0,
                preload: 0,
                splash: 1,
                timeout: 10000,
                timeout_ms: null,
              },
            ],
            categories: [],
          },
        },
      })
    )

    const { getByText, container } = render(
      <Wrapper>
        <MemoryRouter>
          <Sidebar />
          <TabViewport />
        </MemoryRouter>
      </Wrapper>
    )

    await waitFor(() => {
      expect(getByText('Shared Cache Tab')).toBeTruthy()
      expect(container.querySelector('[data-mounted-tab-id="501"]')).toBeTruthy()
    })

    expect(mockSidebar).toHaveBeenCalledTimes(1)
  })
})
