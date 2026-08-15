import { fireEvent, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/mocks/server';
import { sessionFor, userFactory } from '@/test/fixtures';
import { setupRouterTest } from '@/test/router-harness';

const renderApp = setupRouterTest();

describe('Login', () => {
  it('submits credentials and redirects home on success', async () => {
    const user = userFactory.build({ email: 'jane@example.com' });
    let receivedBody: unknown;
    let signedIn = false;
    server.use(
      http.get('/api/auth/get-session', () =>
        HttpResponse.json(signedIn ? sessionFor(user) : null),
      ),
      http.post('/api/auth/sign-in/email', async ({ request }) => {
        receivedBody = await request.json();
        signedIn = true;
        return HttpResponse.json({ redirect: false, token: 'test-token', user });
      }),
    );
    await renderApp('/login');
    await screen.findByRole('heading', { name: 'Log in' });

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await screen.findByText('Find and register for upcoming events.');
    expect(receivedBody).toEqual({ email: 'jane@example.com', password: 'password1234' });
  });

  it('shows the server error message when sign-in fails', async () => {
    server.use(
      http.get('/api/auth/get-session', () => HttpResponse.json(null)),
      http.post(
        '/api/auth/sign-in/email',
        () =>
          new HttpResponse(
            JSON.stringify({
              message: 'Invalid email or password.',
              code: 'INVALID_EMAIL_OR_PASSWORD',
            }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
          ),
      ),
    );
    await renderApp('/login');
    await screen.findByRole('heading', { name: 'Log in' });

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await screen.findByText('Invalid email or password.');
  });
});
