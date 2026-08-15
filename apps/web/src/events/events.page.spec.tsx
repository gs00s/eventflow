import { screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/mocks/server';
import { eventFactory, sessionFor, userFactory } from '@/test/fixtures';
import { setupRouterTest } from '@/test/router-harness';

const renderApp = setupRouterTest();

describe('EventsPage', () => {
  it('renders the fetched events, each linking to their detail page', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));
    const event = eventFactory.build();
    server.use(http.get('/api/events', () => HttpResponse.json([event])));

    await renderApp('/events');

    const link = await screen.findByRole('link', { name: event.title });
    expect(link.getAttribute('href')).toBe(`/events/${event.id}`);
    expect(screen.getByText(`${event.date} · ${event.location.city}`)).toBeTruthy();
  });

  it('badges a VIP event in the public list', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));
    const event = eventFactory.build({ isVip: true });
    server.use(http.get('/api/events', () => HttpResponse.json([event])));

    await renderApp('/events');

    await screen.findByRole('link', { name: event.title });
    expect(screen.getByText('VIP')).toBeTruthy();
  });

  it('fetches the VIP-inclusive list for a signed-in VIP user', async () => {
    const vipUser = userFactory.build({ isVip: true });
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(sessionFor(vipUser))));
    const publicEvent = eventFactory.build({ title: 'Public Meetup' });
    const vipEvent = eventFactory.build({ title: 'VIP Gala', isVip: true });
    server.use(http.get('/api/events/vip', () => HttpResponse.json([publicEvent, vipEvent])));

    await renderApp('/events');

    await screen.findByRole('link', { name: publicEvent.title });
    expect(screen.getByRole('link', { name: vipEvent.title })).toBeTruthy();
  });

  it('shows an error message when the request fails', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));
    server.use(http.get('/api/events', () => new HttpResponse(null, { status: 500 })));

    await renderApp('/events');

    const error = await screen.findByText('Failed to load events.');

    expect(error).toBeTruthy();
  });
});
