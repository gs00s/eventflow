import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/mocks/server';
import { userFactory } from '@/test/fixtures';
import { Profile } from './profile';

function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('Profile', () => {
  it('renders the fetched current user', async () => {
    const user = userFactory.build();
    server.use(
      http.get('/api/users/me', () =>
        HttpResponse.json({ id: user.id, name: user.name, email: user.email }),
      ),
    );

    renderWithQueryClient(<Profile />);

    expect(await screen.findByText(user.name)).toBeTruthy();
    expect(screen.getByText(user.email)).toBeTruthy();
  });

  it('shows an error message when the request fails', async () => {
    server.use(http.get('/api/users/me', () => new HttpResponse(null, { status: 401 })));

    renderWithQueryClient(<Profile />);

    const error = await screen.findByText('Failed to load your profile.');

    expect(error).toBeTruthy();
  });
});
