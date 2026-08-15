import { screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/mocks/server';
import { eventFactory, eventSessionFactory, speakerFactory } from '@/test/fixtures';
import { setupRouterTest } from '@/test/router-harness';

const renderApp = setupRouterTest();

describe('EventDetail', () => {
  it('renders the event with its schedule and speaker roster, each linking to the speaker detail page', async () => {
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
            })
          : new HttpResponse(null, { status: 404 }),
      ),
    );

    await renderApp(`/events/${event.id}`);

    await screen.findByRole('heading', { name: event.title });
    expect(screen.getByText(session.title)).toBeTruthy();
    const links = await screen.findAllByRole('link', { name: speaker.name });
    expect(links.length).toBeGreaterThanOrEqual(1);
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
});
