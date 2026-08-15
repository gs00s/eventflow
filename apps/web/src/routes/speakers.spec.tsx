import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/mocks/server';
import { Speakers } from './speakers';

function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('Speakers', () => {
  it('renders the fetched speaker names', async () => {
    server.use(
      http.get('/api/speakers', () =>
        HttpResponse.json([{ id: '1', name: 'Dr. Jane Doe', title: '', bio: '', image: '' }]),
      ),
    );

    renderWithQueryClient(<Speakers />);

    const name = await screen.findByText('Dr. Jane Doe');

    expect(name).toBeTruthy();
  });

  it('shows an error message when the request fails', async () => {
    server.use(http.get('/api/speakers', () => new HttpResponse(null, { status: 500 })));

    renderWithQueryClient(<Speakers />);

    const error = await screen.findByText('Failed to load speakers.');

    expect(error).toBeTruthy();
  });
});
