import { GlobalWindow } from 'happy-dom'
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'

const happyWindow = new GlobalWindow({ url: 'http://localhost:5173/wizard' })
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

const mockComplete = mock((payload: { baseUrl: string }) =>
  Promise.resolve({ data: { data: { success: true, payload } } })
)
const mockToastSuccess = mock(() => {})
const mockToastError = mock(() => {})

mock.module('../../api/client', () => ({
  api: {
    wizard: {
      complete: mockComplete,
    },
  },
}))

mock.module('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}))

import { MemoryRouter } from 'react-router-dom'
import Wizard from './index'

function renderWizard() {
  return render(
    <MemoryRouter>
      <Wizard />
    </MemoryRouter>
  )
}

function goToSettingsStep(view: ReturnType<typeof renderWizard>) {
  fireEvent.click(view.getByRole('button', { name: 'Next' }))
  fireEvent.click(view.getByRole('button', { name: 'Next' }))

  fireEvent.change(view.getByLabelText(/Username/i), { target: { value: 'admin' } })
  fireEvent.change(view.getByLabelText(/^Password/), { target: { value: 'password123' } })
  fireEvent.change(view.getByLabelText(/Confirm Password/i), { target: { value: 'password123' } })

  fireEvent.click(view.getByRole('button', { name: 'Next' }))
}

describe('Wizard settings step', () => {
  beforeEach(() => {
    mockComplete.mockClear()
    mockToastSuccess.mockClear()
    mockToastError.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows the base URL field, helper text, and allows an empty value', () => {
    const view = renderWizard()
    goToSettingsStep(view)

    expect(view.getByLabelText('Base URL')).toBeTruthy()
    expect(
      view.getByText(
        'If you access OrganizrX through a reverse proxy, enter that URL here. Leave empty for direct access.'
      )
    ).toBeTruthy()

    const baseUrlInput = view.getByLabelText('Base URL')
    fireEvent.change(baseUrlInput, { target: { value: 'not-a-url' } })
    fireEvent.click(view.getByRole('button', { name: 'Next' }))

    expect(view.getByText('Must be a valid URL')).toBeTruthy()

    fireEvent.change(baseUrlInput, { target: { value: '' } })
    fireEvent.click(view.getByRole('button', { name: 'Next' }))

    expect(view.getByRole('heading', { level: 3, name: 'Ready to Go!' })).toBeTruthy()
  })

  it('submits the base URL when setup completes', async () => {
    const view = renderWizard()
    goToSettingsStep(view)

    fireEvent.change(view.getByLabelText('Base URL'), {
      target: { value: 'https://dash.example.com' },
    })

    fireEvent.click(view.getByRole('button', { name: 'Next' }))
    fireEvent.click(view.getByRole('button', { name: 'Complete Setup' }))

    await waitFor(() => {
      expect(mockComplete.mock.calls.length).toBe(1)
    })

    const [payload] = mockComplete.mock.calls[0]
    expect(payload.baseUrl).toBe('https://dash.example.com')
  })
})
