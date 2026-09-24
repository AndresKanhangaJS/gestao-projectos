import '@testing-library/jest-dom/vitest'

// jsdom não implementa ResizeObserver (usado por alguns primitivos Radix, ex.: Checkbox).
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
