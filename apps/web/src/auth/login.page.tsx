import { useNavigate } from '@tanstack/react-router';
import { LoginForm, type LoginFormValues } from './components/login-form';
import { authClient } from '@/lib/auth-client';

export function LoginPage() {
  const navigate = useNavigate();

  async function handleSubmit(values: LoginFormValues): Promise<string | undefined> {
    const { error } = await authClient.signIn.email(values);
    if (error) return error.message ?? 'Invalid email or password.';

    await navigate({ to: '/' });
    return undefined;
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <LoginForm onSubmit={handleSubmit} />
    </div>
  );
}
