import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  type RouterHistory,
} from '@tanstack/react-router';
import { authClient } from '@/lib/auth-client';
import { RootLayout } from '@/routes/root';
import { EventDetail } from '@/routes/event-detail';
import { Events } from '@/routes/events';
import { Home } from '@/routes/home';
import { Login } from '@/routes/login';
import { Profile } from '@/routes/profile';
import { Register } from '@/routes/register';
import { SpeakerDetail } from '@/routes/speaker-detail';
import { Speakers } from '@/routes/speakers';

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
});

const eventsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/events',
  component: Events,
});

const eventDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/events/$eventId',
  component: EventDetail,
});

const speakersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/speakers',
  component: Speakers,
});

const speakerDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/speakers/$speakerId',
  component: SpeakerDetail,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (data?.user) throw redirect({ to: '/' });
  },
  component: Login,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (data?.user) throw redirect({ to: '/' });
  },
  component: Register,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data?.user) throw redirect({ to: '/login' });
  },
  component: Profile,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  eventsRoute,
  eventDetailRoute,
  speakersRoute,
  speakerDetailRoute,
  loginRoute,
  registerRoute,
  profileRoute,
]);

export function createAppRouter(history?: RouterHistory) {
  return createRouter({ routeTree, history });
}

export const router = createAppRouter();

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
