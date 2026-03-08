import { GlobalWindow } from 'happy-dom'
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { render, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useTabStore } from '../store'
import type { Tab } from '@organizrx/shared'

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
  } catch {}
}
Object.defineProperty(globalThis, 'window', {
  value: happyWindow,
  writable: true,
  configurable: true,
})

type SidebarTab = Pick<
  Tab,
  | 'id'
  | 'name'
  | 'url'
  | 'url_local'
  | 'enabled'
  | 'type'
  | 'timeout'
  | 'timeout_ms'
  | 'preload'
  | 'splash'
>

const createSidebarResponse = (tabs: SidebarTab[]) => ({
  data: {
    data: {
      tabs,
    },
  },
})

const defaultTabs: SidebarTab[] = [
  {
    id: 101,
    name: 'Plex',
    url: 'https://plex.example',
    url_local: null,
    enabled: 1,
    type: 0,
    timeout: 10000,
    timeout_ms: null,
    preload: 0,
    splash: 1,
  },
  {
    id: 202,
    name: 'Users',
    url: '/users',
    url_local: null,
    enabled: 1,
    type: 1,
    timeout: 10000,
    timeout_ms: null,
    preload: 0,
    splash: 0,
  },
]

const mockSidebar = mock(() => Promise.resolve(createSidebarResponse(defaultTabs)))

mock.module('../api/client', () => ({
  default: {},
  api: {
    tabs: {
      sidebar: mockSidebar,
    },
  },
}))

import TabViewport from './TabViewport'

describe('TabViewport', () => {
  beforeEach(() => {
    useTabStore.getState().resetTabs()
    mockSidebar.mockClear()
  })

  afterEach(() => {
    cleanup()
    useTabStore.getState().resetTabs()
  })

  it('keeps visited iframe tab mounted while hidden after navigation', async () => {
    useTabStore.getState().setActiveTabId(101)

    const { container, rerender } = render(
      <MemoryRouter initialEntries={['/tab/101']}>
        <Routes>
          <Route path="/tab/:id" element={<TabViewport />} />
          <Route path="/settings" element={<TabViewport />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(container.querySelector('[data-mounted-tab-id="101"]')).toBeTruthy()
    })

    useTabStore.getState().setActiveTabId(null)

    rerender(
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/tab/:id" element={<TabViewport />} />
          <Route path="/settings" element={<TabViewport />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      const mounted = container.querySelector('[data-mounted-tab-id="101"]')
      expect(mounted).toBeTruthy()
      expect(mounted?.className).toContain('invisible')
      expect(container.querySelector('iframe')).toBeTruthy()
    })
  })

  it('does not render internal tabs as iframes', async () => {
    useTabStore.getState().setActiveTabId(202)

    const { container } = render(
      <MemoryRouter initialEntries={['/tab/202']}>
        <Routes>
          <Route path="/tab/:id" element={<TabViewport />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mockSidebar).toHaveBeenCalled()
    })

    expect(container.querySelector('[data-mounted-tab-id="202"]')).toBeNull()
    expect(container.querySelector('iframe')).toBeNull()
  })

  it('preloads only tabs with preload enabled on app start', async () => {
    mockSidebar.mockResolvedValueOnce(
      createSidebarResponse([
        {
          id: 303,
          name: 'Radarr',
          url: 'https://radarr.example',
          url_local: null,
          enabled: 1,
          type: 0,
          timeout: 10000,
          timeout_ms: null,
          preload: 1,
          splash: 0,
        },
        {
          id: 404,
          name: 'Sonarr',
          url: 'https://sonarr.example',
          url_local: null,
          enabled: 1,
          type: 0,
          timeout: 10000,
          timeout_ms: null,
          preload: 0,
          splash: 0,
        },
      ])
    )

    const { container } = render(
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/tab/:id" element={<TabViewport />} />
          <Route path="/settings" element={<TabViewport />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(useTabStore.getState().mountedTabs).toContain(303)
      expect(container.querySelector('[data-mounted-tab-id="303"]')).toBeTruthy()
    })

    expect(useTabStore.getState().mountedTabs).not.toContain(404)
    expect(container.querySelector('[data-mounted-tab-id="404"]')).toBeNull()

    const preloadedIframe = container.querySelector('iframe')
    expect(preloadedIframe?.getAttribute('loading')).toBe('eager')
    expect(container.querySelector('[data-mounted-tab-id="303"]')?.className).toContain('invisible')
  })

  it('does not render a splash overlay for tabs with splash disabled', async () => {
    mockSidebar.mockResolvedValueOnce(
      createSidebarResponse([
        {
          id: 303,
          name: 'No Splash',
          url: 'https://nosplash.example',
          url_local: null,
          enabled: 1,
          type: 0,
          timeout: null,
          timeout_ms: null,
          preload: 0,
          splash: 0,
        },
      ])
    )

    useTabStore.getState().setActiveTabId(303)

    const { container, queryByTestId } = render(
      <MemoryRouter initialEntries={['/tab/303']}>
        <Routes>
          <Route path="/tab/:id" element={<TabViewport />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(container.querySelector('[data-mounted-tab-id="303"]')).toBeTruthy()
    })

    expect(queryByTestId('iframe-loading-overlay')).toBeNull()
  })
})
