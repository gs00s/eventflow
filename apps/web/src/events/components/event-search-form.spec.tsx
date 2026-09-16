import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EventSearchForm } from './event-search-form';

describe('EventSearchForm', () => {
  it('calls onSubmit with the trimmed query', async () => {
    const onSubmit = vi.fn();
    render(<EventSearchForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Search events'), {
      target: { value: '  cloud computing  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('cloud computing');
    });
  });

  it('pre-fills the input from defaultValue', () => {
    render(<EventSearchForm defaultValue="kubernetes" onSubmit={vi.fn()} />);

    const input = screen.getByLabelText('Search events') as HTMLInputElement;
    expect(input.value).toBe('kubernetes');
  });

  it('disables the submit button when the query is empty', () => {
    render(<EventSearchForm onSubmit={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'Search' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('disables the submit button when the query is only whitespace', () => {
    render(<EventSearchForm onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Search events'), { target: { value: '   ' } });

    const button = screen.getByRole('button', { name: 'Search' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('enables the submit button once a non-empty query is entered', () => {
    render(<EventSearchForm onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Search events'), { target: { value: 'cloud' } });

    const button = screen.getByRole('button', { name: 'Search' }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });
});
