import { GlobalWindow } from 'happy-dom'

const window = new GlobalWindow({ url: 'http://localhost:5173' })

// Register all window globals on globalThis
for (const key of Object.getOwnPropertyNames(window)) {
  if (key === 'undefined' || key === 'NaN' || key === 'Infinity') continue
  if (key in globalThis && !['document', 'window', 'navigator', 'location', 'history',
    'localStorage', 'sessionStorage', 'getComputedStyle', 'requestAnimationFrame',
    'cancelAnimationFrame', 'MutationObserver', 'DOMParser', 'XMLSerializer',
    'HTMLElement', 'HTMLDivElement', 'HTMLButtonElement', 'HTMLInputElement',
    'HTMLFormElement', 'HTMLAnchorElement', 'HTMLSpanElement', 'HTMLParagraphElement',
    'HTMLPreElement', 'DocumentFragment', 'Element', 'Node', 'Text', 'Comment',
    'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent', 'SVGElement',
    'SVGSVGElement',
  ].includes(key)) continue

  try {
    const descriptor = Object.getOwnPropertyDescriptor(window, key)
    if (descriptor) {
      Object.defineProperty(globalThis, key, {
        ...descriptor,
        configurable: true,
      })
    }
  } catch {
    // Some properties can't be overridden
  }
}

Object.defineProperty(globalThis, 'window', {
  value: window,
  writable: true,
  configurable: true,
})
