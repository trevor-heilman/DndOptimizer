/**
 * Global test setup — runs before every test file.
 */
import '@testing-library/jest-dom';
import { server } from './mocks/server';
import { afterAll, afterEach, beforeAll } from 'vitest';

// Start MSW server before all tests, reset handlers after each,
// clean up after all tests.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
