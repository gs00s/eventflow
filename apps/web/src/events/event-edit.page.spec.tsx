import { fireEvent, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/mocks/server';
import { ownedEventFactory, sessionFor, userFactory } from '@/test/fixtures';
import { setupRouterTest } from '@/test/router-harness';

const renderApp = setupRouterTest();

describe('EventEditPage', () => {
  it('redirects to login when logged out', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));

    await renderApp('/events/event-1/edit');

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeTruthy();
  });

  it('pre-fills the form from the fetched event', async () => {
    const event = ownedEventFactory.build({ title: 'Kubernetes Deep Dive' });
    server.use(
      http.get('/api/auth/get-session', () => HttpResponse.json(sessionFor(userFactory.build()))),
      http.get(`/api/events/mine/${event.id}`, () => HttpResponse.json(event)),
    );

    await renderApp(`/events/${event.id}/edit`);

    const title = (await screen.findByLabelText('Title')) as HTMLInputElement;
    expect(title.value).toBe('Kubernetes Deep Dive');
  });

  it('shows a failure message when the event cannot be loaded', async () => {
    server.use(
      http.get('/api/auth/get-session', () => HttpResponse.json(sessionFor(userFactory.build()))),
      http.get('/api/events/mine/missing-id', () => new HttpResponse(null, { status: 404 })),
    );

    await renderApp('/events/missing-id/edit');

    expect(await screen.findByText('Failed to load event.')).toBeTruthy();
  });

  it('saves changes and navigates to My Events on success', async () => {
    const event = ownedEventFactory.build({ title: 'Kubernetes Deep Dive' });
    server.use(
      http.get('/api/auth/get-session', () => HttpResponse.json(sessionFor(userFactory.build()))),
      http.get(`/api/events/mine/${event.id}`, () => HttpResponse.json(event)),
      http.patch(`/api/events/${event.id}`, () =>
        HttpResponse.json(ownedEventFactory.build({ ...event, title: 'Updated' })),
      ),
      http.get('/api/events/mine', () => HttpResponse.json([])),
    );

    await renderApp(`/events/${event.id}/edit`);
    await screen.findByLabelText('Title');
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByRole('heading', { name: 'My Events' })).toBeTruthy();
  });

  it('shows an error message when saving fails', async () => {
    const event = ownedEventFactory.build({ title: 'Kubernetes Deep Dive' });
    server.use(
      http.get('/api/auth/get-session', () => HttpResponse.json(sessionFor(userFactory.build()))),
      http.get(`/api/events/mine/${event.id}`, () => HttpResponse.json(event)),
      http.patch(`/api/events/${event.id}`, () => new HttpResponse(null, { status: 500 })),
    );

    await renderApp(`/events/${event.id}/edit`);
    await screen.findByLabelText('Title');
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Failed to update event')).toBeTruthy();
  });
});
