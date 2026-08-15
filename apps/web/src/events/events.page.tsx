import { useQuery } from '@tanstack/react-query';
import { fetchEvents, fetchEventsVip } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { EventListItem } from './components/event-list-item';

export function EventsPage() {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const isVip = session?.user.isVip ?? false;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['events', { isVip }],
    queryFn: isVip ? fetchEventsVip : fetchEvents,
    enabled: !isSessionPending,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Events</h1>
      {(isSessionPending || isLoading) && <p className="mt-4 text-muted-foreground">Loading…</p>}
      {isError && <p className="mt-4 text-destructive">Failed to load events.</p>}
      {data && (
        <ul className="mt-4 space-y-4">
          {data.map((event) => (
            <EventListItem key={event.id} event={event} />
          ))}
        </ul>
      )}
    </div>
  );
}
