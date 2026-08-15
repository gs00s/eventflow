import { screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/mocks/server';
import { setupRouterTest } from '@/test/router-harness';
import { sessionFor, userFactory } from '@/test/fixtures';

const renderApp = setupRouterTest();

describe('Nav', () => {
  it('renders links to Home, Events, and Speakers, highlighting the active one', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));
    await renderApp('/');
    await screen.findByRole('link', { name: 'Home' });

    const home = screen.getByRole('link', { name: 'Home' });
    const events = screen.getByRole('link', { name: 'Events' });
    const speakers = screen.getByRole('link', { name: 'Speakers' });

    expect(home.getAttribute('aria-current')).toBe('page');
    expect(events.getAttribute('aria-current')).toBeNull();
    expect(speakers.getAttribute('aria-current')).toBeNull();
  });

  it('shows login and register links when logged out', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));
    await renderApp('/');
    await screen.findByRole('link', { name: 'Home' });

    expect(await screen.findByRole('link', { name: 'Log in' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Register' })).toBeTruthy();
    expect(screen.queryByText('JD')).toBeNull();
  });

  it('shows an avatar with initials instead of login/register when logged in', async () => {
    server.use(
      http.get('/api/auth/get-session', () => HttpResponse.json(sessionFor(userFactory.build()))),
    );
    await renderApp('/');
    await screen.findByRole('link', { name: 'Home' });

    expect(await screen.findByText('JD')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Log in' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Register' })).toBeNull();
  });
});
