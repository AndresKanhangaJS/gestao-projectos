import '@testing-library/jest-dom/vitest'

// jsdom não implementa ResizeObserver (usado por alguns primitivos Radix, ex.: Checkbox).
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// jsdom não implementa a captura de ponteiro nem scrollIntoView (usados pelo Radix Select).
if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
}
