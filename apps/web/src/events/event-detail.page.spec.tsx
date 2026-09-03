import { screen } from '@testing-library/react';
import type { LayoutComponent } from '@eventflow/shared-types';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/mocks/server';
import {
  eventFactory,
  eventSessionFactory,
  layoutFactory,
  sessionFor,
  speakerFactory,
  userFactory,
} from '@/test/fixtures';
import { setupRouterTest } from '@/test/router-harness';

const renderApp = setupRouterTest();

function findByType<T extends LayoutComponent['type']>(
  components: LayoutComponent[],
  type: T,
): Extract<LayoutComponent, { type: T }> {
  const found = components.find((component) => component.type === type);
  if (!found) throw new Error(`No component of type ${type}`);
  return found as Extract<LayoutComponent, { type: T }>;
}

describe('EventDetailPage', () => {
  it('renders the event layout: heading, paragraph, session schedule, and speaker list', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));
    const event = eventFactory.build();
    const layout = layoutFactory.build();
    const sessionCard = findByType(layout.components, 'SessionSchedule').components[0];
    const speakerCard = findByType(layout.components, 'SpeakerList').components[0];
    const featuredSpeaker = speakerFactory.build({ id: speakerCard.data.id, name: 'Alex Rivera' });
    server.use(
      http.get('/api/events/:id', ({ params }) =>
        params.id === event.id
          ? HttpResponse.json({
              ...event,
              description: 'A one-day event focused on cloud, AI/ML, and serverless technologies.',
              organizer: { name: 'Snapsoft', image: '...' },
              sessions: [],
              speakers: [featuredSpeaker],
              layout,
            })
          : new HttpResponse(null, { status: 404 }),
      ),
    );

    await renderApp(`/events/${event.id}`);

    await screen.findByRole('heading', { name: event.title });
    expect(await screen.findByText('About the Summit')).toBeTruthy();
    expect(screen.getByText('Join us for a day of cloud innovation.')).toBeTruthy();
    expect(screen.getByText(sessionCard.data.title)).toBeTruthy();
    const speakerLink = screen.getByRole('link', { name: sessionCard.data.speaker.name });
    expect(speakerLink.getAttribute('href')).toBe(`/speakers/${sessionCard.data.speaker.id}`);
    const featuredLink = screen.getByRole('link', { name: featuredSpeaker.name });
    expect(featuredLink.getAttribute('href')).toBe(`/speakers/${featuredSpeaker.id}`);
  });

  it('falls back to a plain schedule and speaker roster when the event has no layout', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));
    const event = eventFactory.build();
    const speaker = speakerFactory.build();
    const session = eventSessionFactory.build({ speaker });
    server.use(
      http.get('/api/events/:id', ({ params }) =>
        params.id === event.id
          ? HttpResponse.json({
              ...event,
              description: 'A one-day event focused on cloud, AI/ML, and serverless technologies.',
              organizer: { name: 'Snapsoft', image: '...' },
              sessions: [session],
              speakers: [speaker],
              layout: null,
            })
          : new HttpResponse(null, { status: 404 }),
      ),
    );

    await renderApp(`/events/${event.id}`);

    await screen.findByRole('heading', { name: event.title });
    expect(await screen.findByRole('heading', { name: 'Session Schedule' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Speakers' })).toBeTruthy();
    expect(screen.getByText(session.title)).toBeTruthy();
    const links = screen.getAllByRole('link', { name: speaker.name });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.getAttribute('href')).toBe(`/speakers/${speaker.id}`);
    }
  });

  it('shows an error message when the request fails', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));
    server.use(http.get('/api/events/:id', () => new HttpResponse(null, { status: 404 })));

    await renderApp('/events/missing-id');

    const error = await screen.findByText('Failed to load event.');

    expect(error).toBeTruthy();
  });

  it('shows an access-denied state for a VIP event when not authorized', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));
    server.use(http.get('/api/events/:id', () => new HttpResponse(null, { status: 403 })));

    await renderApp('/events/some-vip-event');

    const message = await screen.findByText('This event is only visible to signed-in VIP users.');

    expect(message).toBeTruthy();
  });

  it('fetches through the VIP route and renders a VIP event for a VIP user', async () => {
    const vipUser = userFactory.build({ isVip: true });
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(sessionFor(vipUser))));
    const event = eventFactory.build({ isVip: true });
    server.use(
      http.get('/api/events/vip/:id', ({ params }) =>
        params.id === event.id
          ? HttpResponse.json({
              ...event,
              description: 'An invite-only gathering for VIP members.',
              organizer: { name: 'Snapsoft', image: '...' },
              sessions: [],
              speakers: [],
              layout: null,
            })
          : new HttpResponse(null, { status: 404 }),
      ),
      http.get('/api/events/:id/register', () => HttpResponse.json({ isRegistered: false })),
    );

    await renderApp(`/events/${event.id}`);

    const heading = await screen.findByRole('heading', { name: event.title });
    expect(heading).toBeTruthy();
  });
});
