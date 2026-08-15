import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';

// authClient caches session state as a module singleton, so each test needs
// a fresh import — resetModules() + a dynamic (not static) import forces that.
export function setupRouterTest() {
  beforeEach(() => {
    vi.resetModules();
  });

  return async function renderApp(initialPath = '/') {
    const { createAppRouter } = await import('@/router');
    const router = createAppRouter(createMemoryHistory({ initialEntries: [initialPath] }));
    return render(<RouterProvider router={router} />);
  };
}
