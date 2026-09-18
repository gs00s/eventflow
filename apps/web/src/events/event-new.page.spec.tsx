import { fireEvent, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/mocks/server';
import { ownedEventFactory, sessionFor, userFactory } from '@/test/fixtures';
import { setupRouterTest } from '@/test/router-harness';

const renderApp = setupRouterTest();

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Kubernetes Deep Dive' } });
  fireEvent.change(screen.getByLabelText('Subtitle'), { target: { value: 'Hands-on workshop' } });
  fireEvent.change(screen.getByLabelText('Description'), {
    target: { value: 'A hands-on workshop for platform teams.' },
  });
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-03-15' } });
  fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Austin' } });
  fireEvent.change(screen.getByLabelText('Venue'), { target: { value: 'Austin Convention Center' } });
  fireEvent.change(screen.getByLabelText('Address'), { target: { value: '500 E Cesar Chavez St' } });
  fireEvent.change(screen.getByLabelText('Organizer Image URL'), { target: { value: '...' } });
  fireEvent.change(screen.getByLabelText('Hero Image URL'), { target: { value: '...' } });
  fireEvent.change(screen.getByLabelText('Hero CTA'), { target: { value: 'Register Now' } });
}

describe('EventNewPage', () => {
  it('redirects to login when logged out', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));

    await renderApp('/events/new');

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeTruthy();
  });

  it('does not show the VIP checkbox for a non-VIP user', async () => {
    server.use(
      http.get('/api/auth/get-session', () =>
        HttpResponse.json(sessionFor(userFactory.build({ isVip: false }))),
      ),
    );

    await renderApp('/events/new');

    await screen.findByLabelText('Title');
    expect(screen.queryByRole('checkbox', { name: 'VIP event' })).toBeNull();
  });

  it('shows the VIP checkbox for a VIP user', async () => {
    server.use(
      http.get('/api/auth/get-session', () =>
        HttpResponse.json(sessionFor(userFactory.build({ isVip: true }))),
      ),
    );

    await renderApp('/events/new');

    expect(await screen.findByRole('checkbox', { name: 'VIP event' })).toBeTruthy();
  });

  it('pre-fills the organizer name from the signed-in user', async () => {
    const user = userFactory.build({ name: 'Jane Doe' });
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(sessionFor(user))));

    await renderApp('/events/new');

    const organizerName = (await screen.findByLabelText('Organizer Name')) as HTMLInputElement;
    expect(organizerName.value).toBe('Jane Doe');
  });

  it('creates the event and navigates to My Events on success', async () => {
    const user = userFactory.build();
    server.use(
      http.get('/api/auth/get-session', () => HttpResponse.json(sessionFor(user))),
      http.post('/api/events', () =>
        HttpResponse.json(
          ownedEventFactory.build({
            id: 'new-event-id',
            title: 'Kubernetes Deep Dive',
            subtitle: 'Hands-on workshop',
            description: 'A hands-on workshop for platform teams.',
            date: '2026-03-15',
            location: {
              city: 'Austin',
              venue: 'Austin Convention Center',
              address: '500 E Cesar Chavez St',
            },
            organizer: { name: user.name, image: '...' },
            hero: { image: '...', cta: 'Register Now' },
            isVip: false,
          }),
          { status: 201 },
        ),
      ),
      http.get('/api/events/mine', () => HttpResponse.json([])),
    );

    await renderApp('/events/new');
    await screen.findByLabelText('Title');
    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Create Event' }));

    expect(await screen.findByRole('heading', { name: 'My Events' })).toBeTruthy();
  });

  it('shows an error message when creation fails', async () => {
    const user = userFactory.build();
    server.use(
      http.get('/api/auth/get-session', () => HttpResponse.json(sessionFor(user))),
      http.post('/api/events', () => new HttpResponse(null, { status: 500 })),
    );

    await renderApp('/events/new');
    await screen.findByLabelText('Title');
    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Create Event' }));

    expect(await screen.findByText('Failed to create event')).toBeTruthy();
  });
});
