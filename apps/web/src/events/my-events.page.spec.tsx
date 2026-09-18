import { fireEvent, screen, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/mocks/server';
import { eventFactory, sessionFor, userFactory } from '@/test/fixtures';
import { setupRouterTest } from '@/test/router-harness';

const renderApp = setupRouterTest();

function ownedEvent(overrides: Partial<ReturnType<typeof eventFactory.build>> = {}) {
  return {
    ...eventFactory.build(overrides),
    description: 'A hands-on workshop for platform teams.',
    organizer: { name: 'Snapsoft', image: '...' },
  };
}

function confirmDeleteButton() {
  return within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' });
}

describe('MyEventsPage', () => {
  it('redirects to login when logged out', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));

    await renderApp('/my-events');

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeTruthy();
  });

  it('shows an empty state with no events', async () => {
    server.use(
      http.get('/api/auth/get-session', () => HttpResponse.json(sessionFor(userFactory.build()))),
      http.get('/api/events/mine', () => HttpResponse.json([])),
    );

    await renderApp('/my-events');

    expect(await screen.findByText("You haven't created any events yet.")).toBeTruthy();
  });

  it("lists the caller's own events with an Edit link", async () => {
    const event = ownedEvent({ title: 'Kubernetes Deep Dive' });
    server.use(
      http.get('/api/auth/get-session', () => HttpResponse.json(sessionFor(userFactory.build()))),
      http.get('/api/events/mine', () => HttpResponse.json([event])),
    );

    await renderApp('/my-events');

    expect(await screen.findByRole('link', { name: event.title })).toBeTruthy();
    const editLink = screen.getByRole('link', { name: 'Edit' });
    expect(editLink.getAttribute('href')).toBe(`/events/${event.id}/edit`);
  });

  it('removes an event from the list after a confirmed delete', async () => {
    const event = ownedEvent({ title: 'Kubernetes Deep Dive' });
    server.use(
      http.get('/api/auth/get-session', () => HttpResponse.json(sessionFor(userFactory.build()))),
      http.get('/api/events/mine', () => HttpResponse.json([event])),
      http.delete(`/api/events/${event.id}`, () => new HttpResponse(null, { status: 200 })),
    );

    await renderApp('/my-events');
    await screen.findByRole('link', { name: event.title });

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(confirmDeleteButton());

    await vi.waitFor(() => {
      expect(screen.queryByRole('link', { name: event.title })).toBeNull();
    });
  });

  it('shows an error and keeps the event when delete fails', async () => {
    const event = ownedEvent({ title: 'Kubernetes Deep Dive' });
    server.use(
      http.get('/api/auth/get-session', () => HttpResponse.json(sessionFor(userFactory.build()))),
      http.get('/api/events/mine', () => HttpResponse.json([event])),
      http.delete(`/api/events/${event.id}`, () => new HttpResponse(null, { status: 500 })),
    );

    await renderApp('/my-events');
    await screen.findByRole('link', { name: event.title });

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(confirmDeleteButton());

    expect(await screen.findByText('Failed to delete the event. Please try again.')).toBeTruthy();

    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByRole('link', { name: event.title })).toBeTruthy();
  });
});
