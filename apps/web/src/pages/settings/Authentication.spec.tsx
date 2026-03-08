import { GlobalWindow } from 'happy-dom'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, render } from '@testing-library/react'
import type { ReactNode } from 'react'

const happyWindow = new GlobalWindow({ url: 'http://localhost:5173/settings/authentication' })
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

mock.module('../../components/SettingsForm', () => ({
  SettingsForm: ({
    title,
    description,
    children,
  }: {
    title: string
    description?: string
    children: (form: {
      register: (name: string) => {
        name: string
        onBlur: () => void
        onChange: () => void
        ref: () => void
      }
      formState: {
        errors: Record<string, { message?: string }>
      }
    }) => ReactNode
  }) => (
    <div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {children({
        register: (name: string) => ({
          name,
          onBlur: () => {},
          onChange: () => {},
          ref: () => {},
        }),
        formState: { errors: {} },
      })}
    </div>
  ),
}))

import Authentication from './Authentication'

describe('Authentication settings page', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders all merged authentication sections and fields', () => {
    const { getByRole, getByLabelText } = render(<Authentication />)

    expect(getByRole('heading', { level: 3, name: 'Local Authentication' })).toBeTruthy()
    expect(getByRole('heading', { level: 3, name: 'Single Sign-On' })).toBeTruthy()
    expect(getByRole('heading', { level: 3, name: 'Plex Authentication' })).toBeTruthy()
    expect(getByRole('heading', { level: 3, name: 'OIDC' })).toBeTruthy()

    expect(getByLabelText('Authentication Method')).toBeTruthy()
    expect(getByLabelText('Session Timeout (Minutes)')).toBeTruthy()
    expect(getByLabelText('Max Login Attempts')).toBeTruthy()
    expect(getByLabelText('Lockout Duration (Minutes)')).toBeTruthy()
    expect(getByLabelText('Two-Factor Authentication (2FA)')).toBeTruthy()
    expect(getByLabelText('Enable SSO')).toBeTruthy()
    expect(getByLabelText('SSO Domain')).toBeTruthy()
    expect(getByLabelText('Cookie Name')).toBeTruthy()
    expect(getByLabelText('Expiration (Hours)')).toBeTruthy()
    expect(getByLabelText('Enable Plex Authentication')).toBeTruthy()
    expect(getByLabelText('Enable OIDC')).toBeTruthy()
    expect(getByLabelText('OIDC Client ID')).toBeTruthy()
    expect(getByLabelText('OIDC Client Secret')).toBeTruthy()
    expect(getByLabelText('OIDC Issuer')).toBeTruthy()
    expect(getByLabelText('OIDC Redirect URI')).toBeTruthy()
  })
})
