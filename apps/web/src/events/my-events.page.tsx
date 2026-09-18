import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@/components/ui/button';
import { fetchMyEvents } from '@/lib/api';
import { OwnedEventListItem } from './components/owned-event-list-item';

export function MyEventsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['events', 'mine'],
    queryFn: fetchMyEvents,
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Events</h1>
        <Link to="/events/new" className={buttonVariants({ variant: 'default', size: 'sm' })}>
          New Event
        </Link>
      </div>
      {isLoading && <p className="mt-4 text-muted-foreground">Loading…</p>}
      {isError && <p className="mt-4 text-destructive">Failed to load your events.</p>}
      {data?.length === 0 && (
        <p className="mt-4 text-muted-foreground">You haven&apos;t created any events yet.</p>
      )}
      {data && data.length > 0 && (
        <ul className="mt-4 space-y-4">
          {data.map((event) => (
            <OwnedEventListItem key={event.id} event={event} />
          ))}
        </ul>
      )}
    </div>
  );
}
