import { useQuery } from '@tanstack/react-query';
import { fetchEvents } from '@/lib/api';
import { EventListItem } from './components/event-list-item';

export function EventsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Events</h1>
      {isLoading && <p className="mt-4 text-muted-foreground">Loading…</p>}
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
