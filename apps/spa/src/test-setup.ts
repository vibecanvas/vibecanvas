import { vi } from 'vitest';

// In browser mode, we don't need to mock window/global objects
// However, we still need to mock some modules for testing

// Mock localStorage for consistent test state (only if window exists)
if (typeof window !== 'undefined') {
  const localStorageMock = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  // Setup localStorage mock
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });
}

// Mock toast functionality for test consistency
vi.mock("@kobalte/core/toast", () => ({
  Toast: vi.fn(),
  toaster: {
    show: vi.fn(() => 1),
    create: vi.fn(),
    dismiss: vi.fn(),
    remove: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
  },
}));