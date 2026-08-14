import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { RootLayout } from '@/routes/root';
import { Home } from '@/routes/home';
import { Speakers } from '@/routes/speakers';

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
});

const speakersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/speakers',
  component: Speakers,
});

const routeTree = rootRoute.addChildren([indexRoute, speakersRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
