import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { fetchEvent } from '@/lib/api';
import { buildFallbackLayout } from './layout/fallback-layout';
import { LayoutRenderer } from './layout/layout-renderer';

export function EventDetailPage() {
  const { eventId } = useParams({ from: '/events/$eventId' });
  const { data, isLoading, isError } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => fetchEvent(eventId),
  });

  return (
    <div>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {isError && <p className="text-destructive">Failed to load event.</p>}
      {data && (
        <>
          <h1 className="text-2xl font-semibold">{data.title}</h1>
          <p className="mt-1 text-muted-foreground">{data.subtitle}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            {data.date} · {data.location.venue}, {data.location.city}
          </p>
          <p className="mt-4">{data.description}</p>

          <div className="mt-8 space-y-8">
            <LayoutRenderer
              components={
                data.layout?.components ?? buildFallbackLayout(data.sessions, data.speakers)
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
