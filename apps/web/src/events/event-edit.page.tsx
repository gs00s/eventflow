import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ApiError, fetchMyEvent, updateEvent } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { EventForm, type EventFormValues } from './components/event-form';

export function EventEditPage() {
  const { eventId } = useParams({ from: '/events/$eventId/edit' });
  const navigate = useNavigate();
  const { data: session, isPending: isSessionPending } = authClient.useSession();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['events', 'mine', eventId],
    queryFn: () => fetchMyEvent(eventId),
  });

  async function handleSubmit(values: EventFormValues): Promise<string | undefined> {
    try {
      await updateEvent(eventId, values);
    } catch (error) {
      return error instanceof ApiError ? error.message : 'Could not save the event.';
    }
    await navigate({ to: '/my-events' });
    return undefined;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Edit Event</h1>
      {(isSessionPending || isLoading) && <p className="mt-4 text-muted-foreground">Loading…</p>}
      {isError && <p className="mt-4 text-destructive">Failed to load event.</p>}
      {data && (
        <EventForm
          defaultValues={{
            title: data.title,
            subtitle: data.subtitle,
            description: data.description,
            date: data.date,
            location: data.location,
            organizer: data.organizer,
            hero: data.hero,
            isVip: data.isVip,
          }}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
          isVipVisible={session?.user.isVip ?? false}
        />
      )}
    </div>
  );
}
