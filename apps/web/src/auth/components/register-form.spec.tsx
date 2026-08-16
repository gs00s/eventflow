import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RegisterForm } from './register-form';

describe('RegisterForm', () => {
  it('calls onSubmit with the entered values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<RegisterForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password1234',
      });
    });
  });

  it('does not submit for a short password', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<RegisterForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the error message returned by onSubmit', async () => {
    const onSubmit = vi.fn().mockResolvedValue('Email already in use.');
    render(<RegisterForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByText('Email already in use.')).toBeTruthy();
  });

  it('disables the submit button while submitting', async () => {
    let resolveSubmit!: (error: string | undefined) => void;
    const onSubmit = vi.fn(
      () =>
        new Promise<string | undefined>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    render(<RegisterForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    const button = (await screen.findByRole('button', {
      name: 'Register',
    })) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    resolveSubmit(undefined);

    await vi.waitFor(() => {
      expect(button.disabled).toBe(false);
    });
  });
});
