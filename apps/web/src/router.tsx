import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  type RouterHistory,
} from '@tanstack/react-router';
import { authClient } from '@/lib/auth-client';
import { RootLayout } from '@/components/root-layout';
import { LoginPage } from '@/auth/login.page';
import { RegisterPage } from '@/auth/register.page';
import { EventDetailPage } from '@/events/event-detail.page';
import { EventsPage } from '@/events/events.page';
import { SpeakerDetailPage } from '@/speakers/speaker-detail.page';
import { SpeakersPage } from '@/speakers/speakers.page';
import { ProfilePage } from '@/users/profile.page';

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: EventsPage,
});

const eventDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/events/$eventId',
  component: EventDetailPage,
});

const speakersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/speakers',
  component: SpeakersPage,
});

const speakerDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/speakers/$speakerId',
  component: SpeakerDetailPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (data?.user) throw redirect({ to: '/' });
  },
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (data?.user) throw redirect({ to: '/' });
  },
  component: RegisterPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data?.user) throw redirect({ to: '/login' });
  },
  component: ProfilePage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
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
