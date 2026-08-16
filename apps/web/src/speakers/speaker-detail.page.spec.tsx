import { screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/mocks/server';
import { eventFactory, speakerFactory } from '@/test/fixtures';
import { setupRouterTest } from '@/test/router-harness';

const renderApp = setupRouterTest();

describe('SpeakerDetailPage', () => {
  it('renders the speaker with their linked events, each linking to the event detail page', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));
    const speaker = speakerFactory.build();
    const event = eventFactory.build();
    server.use(
      http.get('/api/speakers/:id', ({ params }) =>
        params.id === speaker.id ? HttpResponse.json(speaker) : new HttpResponse(null, { status: 404 }),
      ),
      http.get('/api/speakers/:id/events', ({ params }) =>
        params.id === speaker.id
          ? HttpResponse.json([{ id: event.id, title: event.title, date: event.date }])
          : new HttpResponse(null, { status: 404 }),
      ),
    );

    await renderApp(`/speakers/${speaker.id}`);

    await screen.findByRole('heading', { name: speaker.name });
    const link = await screen.findByRole('link', { name: event.title });
    expect(link.getAttribute('href')).toBe(`/events/${event.id}`);
  });

  it('shows an error message when the request fails', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));
    server.use(
      http.get('/api/speakers/:id', () => new HttpResponse(null, { status: 404 })),
      http.get('/api/speakers/:id/events', () => new HttpResponse(null, { status: 404 })),
    );

    await renderApp('/speakers/missing-id');

    const error = await screen.findByText('Failed to load speaker.');

    expect(error).toBeTruthy();
  });
});
