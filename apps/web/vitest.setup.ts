import { cleanup } from '@testing-library/react';
import { afterAll, afterEach } from 'vitest';
import { server } from './src/test/mocks/server';

afterEach(() => {
  cleanup();
});

// Must run synchronously here (not inside beforeAll) so global fetch is
// already patched before any spec file's static imports evaluate — libraries
// like Better Auth's client capture a `fetch` reference once, at module
// construction time, and a beforeAll hook fires after those imports run.
server.listen({ onUnhandledRequest: 'error' });
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
