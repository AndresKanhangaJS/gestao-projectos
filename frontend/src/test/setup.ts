import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'

// findBy*/waitFor esperam 1 s por omissão; com muitos workers em paralelo (VM Docker com
// muitas CPUs) os diálogos Radix podem demorar mais a abrir e os testes falhavam de forma
// intermitente. 5 s continua muito abaixo do testTimeout (vite.config.ts).
configure({ asyncUtilTimeout: 5000 })

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
