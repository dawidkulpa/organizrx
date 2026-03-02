import { GlobalWindow } from 'happy-dom'
import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test'
import { render, waitFor } from '@testing-library/react'
import { lazy } from 'react'
import type { ComponentType } from 'react'

// ---------------------------------------------------------------------------
// Setup happy-dom globals for React component testing
// ---------------------------------------------------------------------------

const happyWindow = new GlobalWindow({ url: 'http://localhost:5173' })
const domGlobals = [
  'document', 'navigator', 'location', 'history', 'localStorage', 'sessionStorage',
  'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame',
  'MutationObserver', 'DOMParser', 'XMLSerializer',
  'HTMLElement', 'HTMLDivElement', 'HTMLButtonElement', 'HTMLInputElement',
  'HTMLFormElement', 'HTMLAnchorElement', 'DocumentFragment', 'Element',
  'Node', 'Text', 'Comment', 'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent',
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
  value: happyWindow, writable: true, configurable: true,
})
import {
  registerWidget,
  unregisterWidget,
  getRegisteredWidgets,
  getWidgetsByPlugin,
  _resetRegistry,
} from './widget-registry'
import type { PluginWidgetRegistration, WidgetProps } from './widget-registry'
import { createWidgetAPI } from './widget-api'
import { WidgetErrorBoundary } from './WidgetErrorBoundary'
import { PluginWidget } from './PluginWidget'
import { useAuthStore } from '../store'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockComponent(text: string): ComponentType<WidgetProps> {
  return function MockWidget() {
    return <div data-testid="mock-widget">{text}</div>
  }
}

function createLazyMockComponent(text: string) {
  return lazy(() =>
    Promise.resolve({
      default: createMockComponent(text) as ComponentType<WidgetProps>,
    }),
  )
}

function createRegistration(
  overrides?: Partial<PluginWidgetRegistration>,
): PluginWidgetRegistration {
  return {
    pluginId: 'test-plugin',
    widgetId: 'test-widget',
    name: 'Test Widget',
    defaultSize: { w: 2, h: 2 },
    component: createLazyMockComponent('Hello from widget'),
    ...overrides,
  }
}

// ============================================================================
// Widget Registry
// ============================================================================

describe('widget registry', () => {
  beforeEach(() => {
    _resetRegistry()
  })

  afterEach(() => {
    _resetRegistry()
  })

  it('should register a widget', () => {
    const reg = createRegistration()
    registerWidget(reg)

    const widgets = getRegisteredWidgets()
    expect(widgets).toHaveLength(1)
    expect(widgets[0].pluginId).toBe('test-plugin')
    expect(widgets[0].widgetId).toBe('test-widget')
    expect(widgets[0].name).toBe('Test Widget')
  })

  it('should register multiple widgets', () => {
    registerWidget(createRegistration({ widgetId: 'w1', name: 'Widget 1' }))
    registerWidget(createRegistration({ widgetId: 'w2', name: 'Widget 2' }))
    registerWidget(createRegistration({ pluginId: 'other', widgetId: 'w3', name: 'Widget 3' }))

    expect(getRegisteredWidgets()).toHaveLength(3)
  })

  it('should unregister a widget', () => {
    registerWidget(createRegistration())
    expect(getRegisteredWidgets()).toHaveLength(1)

    unregisterWidget('test-plugin', 'test-widget')
    expect(getRegisteredWidgets()).toHaveLength(0)
  })

  it('should handle unregistering a non-existent widget', () => {
    unregisterWidget('nonexistent', 'nope')
    expect(getRegisteredWidgets()).toHaveLength(0)
  })

  it('should get widgets by plugin', () => {
    registerWidget(createRegistration({ widgetId: 'w1' }))
    registerWidget(createRegistration({ widgetId: 'w2' }))
    registerWidget(createRegistration({ pluginId: 'other', widgetId: 'w3' }))

    const testPluginWidgets = getWidgetsByPlugin('test-plugin')
    expect(testPluginWidgets).toHaveLength(2)

    const otherPluginWidgets = getWidgetsByPlugin('other')
    expect(otherPluginWidgets).toHaveLength(1)
    expect(otherPluginWidgets[0].widgetId).toBe('w3')
  })

  it('should return empty array for unknown plugin', () => {
    expect(getWidgetsByPlugin('unknown')).toHaveLength(0)
  })

  it('should overwrite registration with same key', () => {
    registerWidget(createRegistration({ name: 'Original' }))
    registerWidget(createRegistration({ name: 'Updated' }))

    const widgets = getRegisteredWidgets()
    expect(widgets).toHaveLength(1)
    expect(widgets[0].name).toBe('Updated')
  })
})

// ============================================================================
// Widget API
// ============================================================================

describe('widget API', () => {
  const originalFetch = globalThis.fetch
  let mockFetch: ReturnType<typeof spyOn<typeof globalThis, 'fetch'>>

  beforeEach(() => {
    mockFetch = spyOn(globalThis, 'fetch').mockImplementation(
      (async () => new Response(JSON.stringify({ data: {} }), { status: 200 })) as unknown as typeof fetch,
    )
    // Set a token for auth tests
    useAuthStore.getState().setToken('test-token-123')
  })

  afterEach(() => {
    mockFetch.mockRestore()
    globalThis.fetch = originalFetch
    useAuthStore.getState().logout()
  })

  it('should have correct pluginId', () => {
    const api = createWidgetAPI('plex')
    expect(api.pluginId).toBe('plex')
  })

  it('should prepend /api/plugins/{pluginId}/ to fetch path', async () => {
    const api = createWidgetAPI('plex')
    await api.fetch('status')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/plugins/plex/status')
  })

  it('should strip leading slash from path', async () => {
    const api = createWidgetAPI('sonarr')
    await api.fetch('/calendar')

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/plugins/sonarr/calendar')
  })

  it('should include auth header from store', async () => {
    const api = createWidgetAPI('plex')
    await api.fetch('status')

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer test-token-123')
  })

  it('should not include auth header when no token', async () => {
    useAuthStore.getState().logout()

    const api = createWidgetAPI('plex')
    await api.fetch('status')

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
  })

  it('should pass through additional init options', async () => {
    const api = createWidgetAPI('plex')
    await api.fetch('command', {
      method: 'POST',
      body: JSON.stringify({ action: 'scan' }),
    })

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ action: 'scan' }))
  })

  it('should fetch settings from /config endpoint', async () => {
    mockFetch.mockRestore()
    mockFetch = spyOn(globalThis, 'fetch').mockImplementation(
      (async () =>
        new Response(
          JSON.stringify({ data: { host: 'http://192.168.1.10:32400', enabled: true } }),
          { status: 200 },
        )) as unknown as typeof fetch,
    )

    const api = createWidgetAPI('plex')
    const settings = await api.getSettings()

    expect(settings.host).toBe('http://192.168.1.10:32400')
    expect(settings.enabled).toBe(true)

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/plugins/plex/config')
  })

  it('should throw on getSettings failure', async () => {
    mockFetch.mockRestore()
    mockFetch = spyOn(globalThis, 'fetch').mockImplementation(
      (async () => new Response('Not found', { status: 404, statusText: 'Not Found' })) as unknown as typeof fetch,
    )

    const api = createWidgetAPI('plex')
    await expect(api.getSettings()).rejects.toThrow('Failed to fetch plugin settings')
  })
})

// ============================================================================
// Widget Error Boundary
// ============================================================================

describe('WidgetErrorBoundary', () => {
  it('should render children when no error', () => {
    const { getByTestId, getByText } = render(
      <WidgetErrorBoundary widgetName="Test Widget">
        <div data-testid="child">All good</div>
      </WidgetErrorBoundary>,
    )

    expect(getByTestId('child')).toBeTruthy()
    expect(getByText('All good')).toBeTruthy()
  })

  it('should catch render error and show fallback', () => {
    function ThrowingComponent(): JSX.Element {
      throw new Error('Widget crashed!')
    }

    const { getByText } = render(
      <WidgetErrorBoundary widgetName="Broken Widget">
        <ThrowingComponent />
      </WidgetErrorBoundary>,
    )

    expect(getByText('Broken Widget failed to load')).toBeTruthy()
    expect(getByText('Widget crashed!')).toBeTruthy()
    expect(getByText('Retry')).toBeTruthy()
  })

  it('should recover when Retry is clicked', async () => {
    let shouldThrow = true

    function ConditionalThrow(): JSX.Element {
      if (shouldThrow) {
        throw new Error('First render fails')
      }
      return <div data-testid="recovered">Recovered!</div>
    }

    const { getByText, getByTestId } = render(
      <WidgetErrorBoundary widgetName="Flaky Widget">
        <ConditionalThrow />
      </WidgetErrorBoundary>,
    )

    // Should show error state
    expect(getByText('Flaky Widget failed to load')).toBeTruthy()

    // Fix the component before clicking retry
    shouldThrow = false
    const retryButton = getByText('Retry')
    retryButton.click()

    await waitFor(() => {
      expect(getByTestId('recovered')).toBeTruthy()
    })
  })
})

// ============================================================================
// PluginWidget container
// ============================================================================

describe('PluginWidget', () => {
  beforeEach(() => {
    _resetRegistry()
    useAuthStore.getState().setToken('test-token')
  })

  afterEach(() => {
    _resetRegistry()
    useAuthStore.getState().logout()
  })

  it('should render loading placeholder then widget content', async () => {
    const registration = createRegistration()

    const { getByText, getByTestId } = render(<PluginWidget registration={registration} size={{ w: 2, h: 2 }} />)

    // Should show loading placeholder initially
    expect(getByText('Loading Test Widget...')).toBeTruthy()

    // Should resolve to the widget
    await waitFor(() => {
      expect(getByTestId('mock-widget')).toBeTruthy()
    })

    expect(getByText('Hello from widget')).toBeTruthy()
  })

  it('should catch errors from widget component', async () => {
    const failingComponent = lazy<ComponentType<WidgetProps>>(() =>
      Promise.resolve({
        default: function FailWidget(): JSX.Element {
          throw new Error('Widget render error')
        },
      }),
    )

    const registration = createRegistration({
      name: 'Failing Widget',
      component: failingComponent,
    })

    const { getByText } = render(<PluginWidget registration={registration} size={{ w: 2, h: 2 }} />)

    await waitFor(() => {
      expect(getByText('Failing Widget failed to load')).toBeTruthy()
    })

    expect(getByText('Widget render error')).toBeTruthy()
  })
})
