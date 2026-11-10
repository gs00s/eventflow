import { useNavigate } from '@tanstack/react-router';
import { ApiError, createEvent } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { EventForm, type EventFormValues } from './components/event-form';

export function EventNewPage() {
  const navigate = useNavigate();
  const { data: session, isPending: isSessionPending } = authClient.useSession();

  async function handleSubmit(values: EventFormValues): Promise<string | undefined> {
    try {
      await createEvent(values);
    } catch (error) {
      return error instanceof ApiError ? error.message : 'Could not create the event.';
    }
    await navigate({ to: '/my-events' });
    return undefined;
  }

  if (isSessionPending) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  const defaultValues: EventFormValues = {
    title: '',
    subtitle: '',
    description: '',
    date: '',
    location: { city: '', venue: '', address: '' },
    organizer: { name: session?.user.name ?? '', image: session?.user.image ?? '' },
    hero: { image: '', cta: '' },
    isVip: false,
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">New Event</h1>
      <EventForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitLabel="Create Event"
        isVipVisible={session?.user.isVip ?? false}
      />
    </div>
  );
}
