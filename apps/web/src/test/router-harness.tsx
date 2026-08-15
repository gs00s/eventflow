import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';

// authClient caches session as a module singleton — resetModules() + dynamic import forces a fresh one per test.
export function setupRouterTest() {
  beforeEach(() => {
    vi.resetModules();
  });

  return async function renderApp(initialPath = '/') {
    const { createAppRouter } = await import('@/router');
    const router = createAppRouter(createMemoryHistory({ initialEntries: [initialPath] }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
  };
}
