import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { fetchRegistrationStatus, registerForEvent, unregisterFromEvent } from '@/lib/api';
import { authClient } from '@/lib/auth-client';

export function EventRegistration({ eventId }: { eventId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const isAuthenticated = !!session?.user;

  const registrationQueryKey = ['events', eventId, 'registration'];
  const registrationQuery = useQuery({
    queryKey: registrationQueryKey,
    queryFn: () => fetchRegistrationStatus(eventId),
    enabled: isAuthenticated && !isSessionPending,
  });

  const registerMutation = useMutation({
    mutationFn: () => registerForEvent(eventId),
    onSuccess: () => {
      queryClient.setQueryData(registrationQueryKey, { isRegistered: true });
    },
  });

  const unregisterMutation = useMutation({
    mutationFn: () => unregisterFromEvent(eventId),
    onSuccess: () => {
      queryClient.setQueryData(registrationQueryKey, { isRegistered: false });
    },
  });

  function handleRegisterClick() {
    if (!isAuthenticated) {
      void navigate({ to: '/login' });
      return;
    }
    registerMutation.mutate();
  }

  if (isAuthenticated && registrationQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (registrationQuery.data?.isRegistered) {
    return (
      <>
        <p className="text-sm font-medium text-primary">You are registered for this event.</p>
        <Button
          variant="outline"
          className="mt-2"
          onClick={() => unregisterMutation.mutate()}
          disabled={unregisterMutation.isPending}
        >
          {unregisterMutation.isPending ? 'Unregistering…' : 'Unregister'}
        </Button>
        {unregisterMutation.isError && (
          <p className="mt-2 text-sm text-destructive">Failed to unregister. Please try again.</p>
        )}
      </>
    );
  }

  return (
    <>
      <Button onClick={handleRegisterClick} disabled={registerMutation.isPending}>
        {registerMutation.isPending ? 'Registering…' : 'Register'}
      </Button>
      {registerMutation.isError && (
        <p className="mt-2 text-sm text-destructive">Failed to register. Please try again.</p>
      )}
    </>
  );
}
