import { screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/mocks/server';
import { speakerFactory } from '@/test/fixtures';
import { setupRouterTest } from '@/test/router-harness';

const renderApp = setupRouterTest();

describe('SpeakersPage', () => {
  it('renders the fetched speakers, each linking to their detail page', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));
    const speaker = speakerFactory.build();
    server.use(http.get('/api/speakers', () => HttpResponse.json([speaker])));

    await renderApp('/speakers');

    const link = await screen.findByRole('link', { name: speaker.name });
    expect(link.getAttribute('href')).toBe(`/speakers/${speaker.id}`);
  });

  it('shows an error message when the request fails', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));
    server.use(http.get('/api/speakers', () => new HttpResponse(null, { status: 500 })));

    await renderApp('/speakers');

    const error = await screen.findByText('Failed to load speakers.');

    expect(error).toBeTruthy();
  });
});
