import { createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Nav } from './nav';

function createTestRouter() {
  const rootRoute = createRootRoute({ component: Nav });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => null,
  });
  const speakersRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/speakers',
    component: () => null,
  });
  const routeTree = rootRoute.addChildren([indexRoute, speakersRoute]);
  return createRouter({ routeTree });
}

describe('Nav', () => {
  it('renders links to Home and Speakers, highlighting the active one', async () => {
    render(<RouterProvider router={createTestRouter()} />);
    await screen.findByText('EventFlow');

    const home = screen.getByRole('link', { name: 'Home' });
    const speakers = screen.getByRole('link', { name: 'Speakers' });

    expect(home.getAttribute('aria-current')).toBe('page');
    expect(speakers.getAttribute('aria-current')).toBeNull();
  });
});
