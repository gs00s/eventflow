import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { Speakers } from './speakers';

vi.mock('@/lib/api', () => ({
  fetchSpeakers: vi
    .fn()
    .mockResolvedValue([{ id: '1', name: 'Dr. Jane Doe', title: '', bio: '', image: '' }]),
}));

function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('Speakers', () => {
  it('renders the fetched speaker names', async () => {
    renderWithQueryClient(<Speakers />);

    expect(await screen.findByText('Dr. Jane Doe')).toBeTruthy();
  });
});
