import { vi } from 'vitest';

// Create a mock EventSource class for testing
class MockEventSource {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSED = 2;

  readyState: number = 0;
  url: string;
  headers?: Record<string, string>;
  addEventListener: (event: string, handler: (...args: any[]) => any) => void = vi.fn();
  removeEventListener: (event: string, handler: (...args: any[]) => any) => void = vi.fn();
  close: () => void = vi.fn();
  onerror?: ((...args: any[]) => any) | null;
  onmessage?: ((...args: any[]) => any) | null;
  onopen?: ((...args: any[]) => any) | null;

  constructor(url: string, options?: { headers?: Record<string, string> }) {
    this.url = url;
    this.headers = options?.headers;
  }
}

// Mock the eventsource module
vi.mock('eventsource', () => {
  return {
    EventSource: MockEventSource,
  };
});

// Also set it globally for access in code
(global as any).EventSource = MockEventSource;
