import { fireEvent, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/mocks/server';
import { sessionFor, userFactory } from '@/test/fixtures';
import { setupRouterTest } from '@/test/router-harness';

const renderApp = setupRouterTest();

describe('Register', () => {
  it('submits the new account and redirects home on success', async () => {
    const user = userFactory.build({ name: 'Jane Doe', email: 'jane@example.com' });
    let receivedBody: unknown;
    let signedIn = false;
    server.use(
      http.get('/api/auth/get-session', () =>
        HttpResponse.json(signedIn ? sessionFor(user) : null),
      ),
      http.post('/api/auth/sign-up/email', async ({ request }) => {
        receivedBody = await request.json();
        signedIn = true;
        return HttpResponse.json({ token: 'test-token', user });
      }),
    );
    await renderApp('/register');
    await screen.findByRole('heading', { name: 'Register' });

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    await screen.findByText('Find and register for upcoming events.');
    expect(receivedBody).toEqual({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password1234',
    });
  });

  it('shows the server error message when sign-up fails', async () => {
    server.use(
      http.get('/api/auth/get-session', () => HttpResponse.json(null)),
      http.post(
        '/api/auth/sign-up/email',
        () =>
          new HttpResponse(
            JSON.stringify({ message: 'Email already in use.', code: 'USER_ALREADY_EXISTS' }),
            {
              status: 422,
              headers: { 'Content-Type': 'application/json' },
            },
          ),
      ),
    );
    await renderApp('/register');
    await screen.findByRole('heading', { name: 'Register' });

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    await screen.findByText('Email already in use.');
  });
});
