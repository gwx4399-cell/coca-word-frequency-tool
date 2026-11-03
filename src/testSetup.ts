// Bind browser tests to jsdom rather than the host Node version's Web Storage.
if (typeof window !== 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: window.localStorage });
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
}
