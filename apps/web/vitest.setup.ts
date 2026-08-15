import { cleanup } from '@testing-library/react';
import { afterAll, afterEach } from 'vitest';
import { server } from './src/test/mocks/server';

afterEach(() => {
  cleanup();
});

// Must run synchronously here, not in beforeAll — Better Auth's client captures `fetch` at import time.
server.listen({ onUnhandledRequest: 'error' });
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
