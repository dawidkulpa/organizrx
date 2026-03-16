import { GlobalWindow } from 'happy-dom'
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { render, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useTabStore } from '../store'
import { createQueryWrapper } from '../test-utils/query-wrapper'

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

const mockGetById = mock((id: number) =>
  Promise.resolve({
    data: {
      data: {
        id,
        enabled: 1,
        type: 0,
      },
    },
  })
)

mock.module('../api/client', () => ({
  default: {},
  api: {
    tabs: {
      getById: mockGetById,
    },
  },
}))

import Tabs from './Tabs'

describe('Tabs route bridge', () => {
  beforeEach(() => {
    useTabStore.getState().resetTabs()
    mockGetById.mockClear()
  })

  afterEach(() => {
    cleanup()
    useTabStore.getState().resetTabs()
  })

  it('sets activeTabId for valid external tab route', async () => {
    render(
      <MemoryRouter initialEntries={['/tab/42']}>
        <Routes>
          <Route path="/tab/:id" element={<Tabs />} />
          <Route path="/" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
      { wrapper: createQueryWrapper() }
    )

    await waitFor(() => {
      expect(useTabStore.getState().activeTabId).toBe(42)
      expect(useTabStore.getState().mountedTabs.includes(42)).toBe(true)
    })
  })

  it('redirects to dashboard when tab does not exist', async () => {
    mockGetById.mockImplementationOnce(() => Promise.reject(new Error('not found')))

    const { getByText } = render(
      <MemoryRouter initialEntries={['/tab/404']}>
        <Routes>
          <Route path="/tab/:id" element={<Tabs />} />
          <Route path="/" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
      { wrapper: createQueryWrapper() }
    )

    await waitFor(() => {
      expect(getByText('Dashboard')).toBeTruthy()
      expect(useTabStore.getState().activeTabId).toBeNull()
    })
  })

  it('redirects to dashboard when tab is unauthorized or internal', async () => {
    mockGetById.mockImplementationOnce(() =>
      Promise.resolve({
        data: {
          data: {
            id: 7,
            enabled: 0,
            type: 0,
          },
        },
      })
    )

    const { getByText } = render(
      <MemoryRouter initialEntries={['/tab/7']}>
        <Routes>
          <Route path="/tab/:id" element={<Tabs />} />
          <Route path="/" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
      { wrapper: createQueryWrapper() }
    )

    await waitFor(() => {
      expect(getByText('Dashboard')).toBeTruthy()
      expect(useTabStore.getState().activeTabId).toBeNull()
    })
  })
})
