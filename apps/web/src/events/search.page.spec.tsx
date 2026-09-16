import { fireEvent, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/mocks/server';
import { eventFactory, sessionFor, userFactory } from '@/test/fixtures';
import { setupRouterTest } from '@/test/router-harness';

const renderApp = setupRouterTest();

describe('SearchPage', () => {
  it('renders an empty state when no query is present', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));

    await renderApp('/search');

    expect(await screen.findByText('Enter a search term above.')).toBeTruthy();
  });

  it('renders matching events for the query in the URL', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));
    const event = eventFactory.build({ title: 'Kubernetes Deep Dive' });
    server.use(
      http.get('/api/events', ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('q')).toBe('kubernetes');
        return HttpResponse.json([event]);
      }),
    );

    await renderApp('/search?q=kubernetes');

    const link = await screen.findByRole('link', { name: event.title });
    expect(link.getAttribute('href')).toBe(`/events/${event.id}`);
  });

  it('pre-fills the search field with the current query', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));
    server.use(http.get('/api/events', () => HttpResponse.json([])));

    await renderApp('/search?q=kubernetes');

    const input = (await screen.findByLabelText('Search events')) as HTMLInputElement;
    expect(input.value).toBe('kubernetes');
  });

  it('re-runs the search when the field is edited and resubmitted', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));
    const first = eventFactory.build({ title: 'Kubernetes Deep Dive' });
    const second = eventFactory.build({ title: 'Serverless Summit' });
    server.use(
      http.get('/api/events', ({ request }) => {
        const q = new URL(request.url).searchParams.get('q');
        return HttpResponse.json(q === 'serverless' ? [second] : [first]);
      }),
    );

    await renderApp('/search?q=kubernetes');
    await screen.findByRole('link', { name: first.title });

    fireEvent.change(screen.getByLabelText('Search events'), { target: { value: 'serverless' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByRole('link', { name: second.title })).toBeTruthy();
  });

  it('shows a no-results message for a query with no matches', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));
    server.use(http.get('/api/events', () => HttpResponse.json([])));

    await renderApp('/search?q=nonexistent');

    expect(await screen.findByText('No events match "nonexistent".')).toBeTruthy();
  });

  it('fetches the VIP-inclusive search for a signed-in VIP user', async () => {
    const vipUser = userFactory.build({ isVip: true });
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(sessionFor(vipUser))));
    const vipEvent = eventFactory.build({ title: 'VIP Gala', isVip: true });
    server.use(http.get('/api/events/vip', () => HttpResponse.json([vipEvent])));

    await renderApp('/search?q=gala');

    expect(await screen.findByRole('link', { name: vipEvent.title })).toBeTruthy();
  });

  it('shows an error message when the search request fails', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));
    server.use(http.get('/api/events', () => new HttpResponse(null, { status: 500 })));

    await renderApp('/search?q=kubernetes');

    expect(await screen.findByText('Failed to load search results.')).toBeTruthy();
  });
});
