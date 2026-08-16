import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { EventRegistration } from './components/event-registration';
import { ApiError, fetchEvent, fetchEventVip } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { buildFallbackLayout } from './layout/fallback-layout';
import { LayoutRenderer } from './layout/layout-renderer';

export function EventDetailPage() {
  const { eventId } = useParams({ from: '/events/$eventId' });
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const isVip = session?.user.isVip ?? false;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['events', eventId, { isVip }],
    queryFn: () => (isVip ? fetchEventVip(eventId) : fetchEvent(eventId)),
    enabled: !isSessionPending,
    retry: false,
  });

  const isAccessDenied = error instanceof ApiError && error.status === 403;

  return (
    <div>
      {(isSessionPending || isLoading) && <p className="text-muted-foreground">Loading…</p>}
      {isAccessDenied && (
        <p className="text-destructive">This event is only visible to signed-in VIP users.</p>
      )}
      {isError && !isAccessDenied && <p className="text-destructive">Failed to load event.</p>}
      {data && (
        <>
          <h1 className="text-2xl font-semibold">{data.title}</h1>
          <p className="mt-1 text-muted-foreground">{data.subtitle}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            {data.date} · {data.location.venue}, {data.location.city}
          </p>
          <p className="mt-4">{data.description}</p>

          <div className="mt-4">
            <EventRegistration eventId={eventId} />
          </div>

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
