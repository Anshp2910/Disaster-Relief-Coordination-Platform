import '@testing-library/jest-dom'

globalThis.IntersectionObserver = class {
  constructor() { this.observe = () => {}; this.unobserve = () => {}; this.disconnect = () => {} }
  observe() {}
  unobserve() {}
  disconnect() {}
}
