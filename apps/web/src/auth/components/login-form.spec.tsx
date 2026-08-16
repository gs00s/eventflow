import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoginForm } from './login-form';

describe('LoginForm', () => {
  it('calls onSubmit with the entered values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'jane@example.com',
        password: 'password1234',
      });
    });
  });

  it('does not submit for an invalid email', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the error message returned by onSubmit', async () => {
    const onSubmit = vi.fn().mockResolvedValue('Invalid email or password.');
    render(<LoginForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Invalid email or password.')).toBeTruthy();
  });

  it('disables the submit button while submitting', async () => {
    let resolveSubmit!: (error: string | undefined) => void;
    const onSubmit = vi.fn(
      () =>
        new Promise<string | undefined>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    render(<LoginForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    const button = (await screen.findByRole('button', {
      name: 'Log in',
    })) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    resolveSubmit(undefined);

    await vi.waitFor(() => {
      expect(button.disabled).toBe(false);
    });
  });
});
