import { useNavigate } from '@tanstack/react-router';
import { RegisterForm, type RegisterFormValues } from './components/register-form';
import { authClient } from '@/lib/auth-client';

export function RegisterPage() {
  const navigate = useNavigate();

  async function handleSubmit(values: RegisterFormValues): Promise<string | undefined> {
    const { error } = await authClient.signUp.email(values);
    if (error) return error.message ?? 'Could not create an account.';

    await navigate({ to: '/' });
    return undefined;
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">Register</h1>
      <RegisterForm onSubmit={handleSubmit} />
    </div>
  );
}
