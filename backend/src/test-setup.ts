// Test setup file for Jest
import 'reflect-metadata';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Extend default timeout for integration tests that boot a full NestJS app.
// Individual specs can override with jest.setTimeout() as needed.
if (typeof jest !== 'undefined') {
  const originalSetTimeout = jest.setTimeout.bind(jest);
  jest.setTimeout = (timeout: number = 5000) => {
    return originalSetTimeout(timeout);
  };
}

/**
 * Default Jest timeout for integration tests (ms).
 * Integration suites that create a NestJS application typically need
 * more than the default 5 s, especially in CI.
 */
export const INTEGRATION_TEST_TIMEOUT = 30_000;
