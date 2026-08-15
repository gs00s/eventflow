import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { fetchEvents } from '@/lib/api';

export function Events() {
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
            <li key={event.id}>
              <Link to="/events/$eventId" params={{ eventId: event.id }} className="underline">
                {event.title}
              </Link>
              <p className="text-sm text-muted-foreground">
                {event.date} · {event.location.city}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
