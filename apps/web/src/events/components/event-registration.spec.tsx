import { fireEvent, screen } from '@testing-library/react';
import { delay, HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/mocks/server';
import { eventFactory, sessionFor, userFactory } from '@/test/fixtures';
import { setupRouterTest } from '@/test/router-harness';

const renderApp = setupRouterTest();

function mockEventDetail(event: ReturnType<typeof eventFactory.build>) {
  server.use(
    http.get('/api/events/:id', ({ params }) =>
      params.id === event.id
        ? HttpResponse.json({
            ...event,
            description: 'A one-day event focused on cloud, AI/ML, and serverless technologies.',
            organizer: { name: 'Snapsoft', image: '...' },
            sessions: [],
            speakers: [],
            layout: null,
          })
        : new HttpResponse(null, { status: 404 }),
    ),
  );
}

describe('EventRegistration', () => {
  it('redirects to login when an unauthenticated viewer clicks Register', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));
    const event = eventFactory.build();
    mockEventDetail(event);

    await renderApp(`/events/${event.id}`);
    const registerButton = await screen.findByRole('button', { name: 'Register' });
    fireEvent.click(registerButton);

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeTruthy();
  });

  it('shows the confirmed state immediately for an already-registered viewer', async () => {
    const user = userFactory.build();
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(sessionFor(user))));
    const event = eventFactory.build();
    mockEventDetail(event);
    server.use(
      http.get('/api/events/:id/register', () => HttpResponse.json({ isRegistered: true })),
    );

    await renderApp(`/events/${event.id}`);

    expect(await screen.findByText('You are registered for this event.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Register' })).toBeNull();
    expect(await screen.findByRole('button', { name: 'Unregister' })).toBeTruthy();
  });

  it('shows a loading state while registering, then a confirmation', async () => {
    const user = userFactory.build();
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(sessionFor(user))));
    const event = eventFactory.build();
    mockEventDetail(event);
    server.use(
      http.get('/api/events/:id/register', () => HttpResponse.json({ isRegistered: false })),
      http.post('/api/events/:id/register', async () => {
        await delay(50);
        return new HttpResponse(null, { status: 201 });
      }),
    );

    await renderApp(`/events/${event.id}`);
    const registerButton = await screen.findByRole('button', { name: 'Register' });
    fireEvent.click(registerButton);

    expect(await screen.findByRole('button', { name: 'Registering…' })).toBeTruthy();
    expect(await screen.findByText('You are registered for this event.')).toBeTruthy();
  });

  it('shows an error message when registering fails', async () => {
    const user = userFactory.build();
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(sessionFor(user))));
    const event = eventFactory.build();
    mockEventDetail(event);
    server.use(
      http.get('/api/events/:id/register', () => HttpResponse.json({ isRegistered: false })),
      http.post('/api/events/:id/register', () => new HttpResponse(null, { status: 500 })),
    );

    await renderApp(`/events/${event.id}`);
    const registerButton = await screen.findByRole('button', { name: 'Register' });
    fireEvent.click(registerButton);

    expect(await screen.findByText('Failed to register. Please try again.')).toBeTruthy();
  });

  it('shows a loading state while unregistering, then reverts to the Register button', async () => {
    const user = userFactory.build();
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(sessionFor(user))));
    const event = eventFactory.build();
    mockEventDetail(event);
    server.use(
      http.get('/api/events/:id/register', () => HttpResponse.json({ isRegistered: true })),
      http.delete('/api/events/:id/register', async () => {
        await delay(50);
        return new HttpResponse(null, { status: 200 });
      }),
    );

    await renderApp(`/events/${event.id}`);
    const unregisterButton = await screen.findByRole('button', { name: 'Unregister' });
    fireEvent.click(unregisterButton);

    expect(await screen.findByRole('button', { name: 'Unregistering…' })).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Register' })).toBeTruthy();
    expect(screen.queryByText('You are registered for this event.')).toBeNull();
  });

  it('shows an error message when unregistering fails', async () => {
    const user = userFactory.build();
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(sessionFor(user))));
    const event = eventFactory.build();
    mockEventDetail(event);
    server.use(
      http.get('/api/events/:id/register', () => HttpResponse.json({ isRegistered: true })),
      http.delete('/api/events/:id/register', () => new HttpResponse(null, { status: 500 })),
    );

    await renderApp(`/events/${event.id}`);
    const unregisterButton = await screen.findByRole('button', { name: 'Unregister' });
    fireEvent.click(unregisterButton);

    expect(await screen.findByText('Failed to unregister. Please try again.')).toBeTruthy();
  });
});
