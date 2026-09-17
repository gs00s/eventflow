import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { fetchEvents, fetchEventsVip } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { EventListItem } from './components/event-list-item';
import { EventSearchForm } from './components/event-search-form';

export function SearchPage() {
  const { q } = useSearch({ from: '/search' });
  const navigate = useNavigate();
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const isVip = session?.user.isVip ?? false;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['events', 'search', q, { isVip }],
    queryFn: () => (isVip ? fetchEventsVip(q) : fetchEvents(q)),
    enabled: !isSessionPending && !!q,
  });

  function handleSearch(query: string) {
    void navigate({ to: '/search', search: { q: query } });
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Search events</h1>
      <div className="mt-4">
        <EventSearchForm defaultValue={q ?? ''} onSubmit={handleSearch} />
      </div>
      {!q && <p className="mt-4 text-muted-foreground">Enter a search term above.</p>}
      {q && (isSessionPending || isLoading) && (
        <p className="mt-4 text-muted-foreground">Loading…</p>
      )}
      {q && isError && <p className="mt-4 text-destructive">Failed to load search results.</p>}
      {q && data && data.length === 0 && (
        <p className="mt-4 text-muted-foreground">No events match &quot;{q}&quot;.</p>
      )}
      {q && data && data.length > 0 && (
        <ul className="mt-4 space-y-4">
          {data.map((event) => (
            <EventListItem key={event.id} event={event} />
          ))}
        </ul>
      )}
    </div>
  );
}
