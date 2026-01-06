import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.matchMedia for components that use media queries
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => false,
    }),
})

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock IntersectionObserver
class IntersectionObserverMock {
    observe = vi.fn()
    disconnect = vi.fn()
    unobserve = vi.fn()
}

Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: IntersectionObserverMock,
})

// Mock ResizeObserver
class ResizeObserverMock {
    observe = vi.fn()
    disconnect = vi.fn()
    unobserve = vi.fn()
}

Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    configurable: true,
    value: ResizeObserverMock,
})
