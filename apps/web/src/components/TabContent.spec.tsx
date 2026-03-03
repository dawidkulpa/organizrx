import { GlobalWindow } from 'happy-dom'
import { describe, it, expect, afterEach } from 'bun:test'
import { render, cleanup } from '@testing-library/react'

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

import TabContent, { type TabData } from './TabContent'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTab(overrides?: Partial<TabData>): TabData {
  return {
    id: 1,
    name: 'Test Tab',
    url: 'https://example.com',
    url_local: null,
    type: 1,
    enabled: 1,
    image: null,
    ...overrides,
  }
}

// ============================================================================
// TabContent Component Tests
// ============================================================================

  afterEach(() => {
    cleanup()
  })

describe('TabContent', () => {
  it('should show loading spinner when isLoading is true', () => {
    const { container } = render(<TabContent tab={createTab()} isLoading={true} />)

    const loader = container.querySelector('.animate-spin')
    expect(loader).toBeTruthy()
  })

  it('should show "Tab not found" when tab is null', () => {
    const { getByText } = render(<TabContent tab={null} isLoading={false} />)

    expect(getByText('Tab not found')).toBeTruthy()
    expect(getByText("This tab doesn't exist or has been disabled.")).toBeTruthy()
  })

  it('should show "Tab not found" when tab is disabled (enabled=0)', () => {
    const { getByText } = render(<TabContent tab={createTab({ enabled: 0 })} isLoading={false} />)

    expect(getByText('Tab not found')).toBeTruthy()
    expect(getByText("This tab doesn't exist or has been disabled.")).toBeTruthy()
  })

  it('should show "No URL configured" when tab type=1 but no URL set', () => {
    const { getByText } = render(
      <TabContent tab={createTab({ type: 1, url: null, url_local: null })} isLoading={false} />
    )

    expect(getByText('No URL configured')).toBeTruthy()
    expect(getByText('This tab has no URL set.')).toBeTruthy()
  })

  it('should render iframe with correct src when tab type=1 and URL is set', () => {
    const { container } = render(
      <TabContent tab={createTab({ type: 1, url: 'https://example.com' })} isLoading={false} />
    )

    const iframe = container.querySelector('iframe')
    expect(iframe).toBeTruthy()
    expect(iframe?.src).toBe('https://example.com/')
  })

  it('should show iframe sandbox attributes correctly', () => {
    const { container } = render(
      <TabContent tab={createTab({ type: 1, url: 'https://example.com' })} isLoading={false} />
    )

    const iframe = container.querySelector('iframe')
    expect(iframe?.sandbox.value).toContain('allow-scripts')
    expect(iframe?.sandbox.value).toContain('allow-same-origin')
    expect(iframe?.sandbox.value).toContain('allow-forms')
    expect(iframe?.sandbox.value).toContain('allow-popups')
  })

  it('should set iframe title to tab name', () => {
    const { container } = render(
      <TabContent
        tab={createTab({ type: 1, name: 'Plex', url: 'https://example.com' })}
        isLoading={false}
      />
    )

    const iframe = container.querySelector('iframe')
    expect(iframe?.title).toBe('Plex')
  })

  it('should use url_local when url is not available', () => {
    const { container } = render(
      <TabContent
        tab={createTab({ type: 1, url: null, url_local: 'http://localhost:32400' })}
        isLoading={false}
      />
    )

    const iframe = container.querySelector('iframe')
    expect(iframe?.src).toBe('http://localhost:32400/')
  })

  it('should show loading overlay initially (iframeLoading state defaults to true)', () => {
    const { container, getByText } = render(
      <TabContent
        tab={createTab({ type: 1, name: 'Test Tab', url: 'https://example.com' })}
        isLoading={false}
      />
    )

    expect(getByText('Loading Test Tab...')).toBeTruthy()
    const loadingOverlay = container.querySelector('.bg-background\\/80')
    expect(loadingOverlay).toBeTruthy()
  })

  it('should render internal page placeholder when tab type=0', () => {
    const { getByText, container } = render(
      <TabContent tab={createTab({ type: 0, name: 'Dashboard' })} isLoading={false} />
    )

    expect(getByText('Dashboard')).toBeTruthy()
    expect(
      getByText('This is a built-in page. Native component rendering will be available soon.')
    ).toBeTruthy()

    const iframe = container.querySelector('iframe')
    expect(iframe).toBeNull()
  })

  it('should show "Internal Page" as default name when type=0 and name is null', () => {
    const { getByText } = render(
      <TabContent tab={createTab({ type: 0, name: null })} isLoading={false} />
    )

    expect(getByText('Internal Page')).toBeTruthy()
  })

  it('should use "Tab content" as default iframe title when name is null', () => {
    const { container } = render(
      <TabContent
        tab={createTab({ type: 1, name: null, url: 'https://example.com' })}
        isLoading={false}
      />
    )

    const iframe = container.querySelector('iframe')
    expect(iframe?.title).toBe('Tab content')
  })
})
