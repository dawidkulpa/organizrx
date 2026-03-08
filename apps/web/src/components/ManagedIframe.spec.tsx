import { GlobalWindow } from 'happy-dom'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import ManagedIframe from './ManagedIframe'

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
  'HTMLIFrameElement',
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

describe('ManagedIframe', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    cleanup()
  })

  it('shows branded loading overlay and removes it when the iframe loads', async () => {
    const { container, getByTestId, getByText, queryByTestId } = render(
      <ManagedIframe src="https://plex.example" title="Plex" tabId={101} isActive splash />
    )

    expect(getByTestId('iframe-loading-overlay')).toBeTruthy()
    expect(getByText('OrganizrX')).toBeTruthy()
    expect(getByText('Plex')).toBeTruthy()

    const iframe = container.querySelector('iframe')
    expect(iframe).toBeTruthy()
    await act(async () => {
      iframe?.dispatchEvent(new Event('load'))
    })

    await waitFor(() => {
      expect(queryByTestId('iframe-loading-overlay')).toBeNull()
    })
  })

  it('renders no loading overlay when splash is disabled', () => {
    const { getByTitle, queryByTestId } = render(
      <ManagedIframe
        src="https://radarr.example"
        title="Radarr"
        tabId={102}
        isActive
        splash={false}
      />
    )

    expect(queryByTestId('iframe-loading-overlay')).toBeNull()
    expect(getByTitle('Radarr')).toBeTruthy()
  })

  it('shows a timeout error and retries by remounting the iframe', async () => {
    const { container, getByRole, getByText, getByTestId, queryByTestId, queryByText } = render(
      <ManagedIframe
        src="https://sonarr.example"
        title="Sonarr"
        tabId={103}
        isActive
        splash
        timeoutMs={10}
      />
    )

    const firstIframe = container.querySelector('iframe')
    expect(firstIframe).toBeTruthy()

    await waitFor(() => {
      expect(getByText('This tab took too long to load')).toBeTruthy()
    })

    const retryButton = getByRole('button', { name: 'Retry' })
    await act(async () => {
      retryButton.click()
    })

    await waitFor(() => {
      expect(getByTestId('iframe-loading-overlay')).toBeTruthy()
      expect(queryByText('This tab took too long to load')).toBeNull()
      expect(container.querySelector('iframe')).not.toBe(firstIframe)
    })

    const retriedIframe = container.querySelector('iframe')
    await act(async () => {
      retriedIframe?.dispatchEvent(new Event('load'))
    })

    await waitFor(() => {
      expect(queryByTestId('iframe-loading-overlay')).toBeNull()
      expect(queryByTestId('iframe-error-overlay')).toBeNull()
    })
  })
})
