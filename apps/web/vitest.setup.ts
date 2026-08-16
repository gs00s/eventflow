import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, vi } from 'vitest';
import failOnConsole from 'vitest-fail-on-console';
import { server } from './src/test/mocks/server';

failOnConsole();

afterEach(() => {
  cleanup();
});

// jsdom doesn't implement scrollTo; TanStack Router's scroll restoration calls it on every navigation.
window.scrollTo = vi.fn();

// Must run synchronously here, not in beforeAll — Better Auth's client captures `fetch` at import time.
server.listen({ onUnhandledRequest: 'error' });
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
