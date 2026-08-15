import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { fetchEvent } from '@/lib/api';

export function EventDetail() {
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

          <h2 className="mt-8 text-lg font-semibold">Schedule</h2>
          <ul className="mt-2 space-y-3">
            {data.sessions.map((session) => (
              <li key={session.id}>
                <p className="font-medium">{session.title}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(session.from).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  –
                  {new Date(session.to).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  · {session.track} · {session.room} ·{' '}
                  <Link
                    to="/speakers/$speakerId"
                    params={{ speakerId: session.speaker.id }}
                    className="underline"
                  >
                    {session.speaker.name}
                  </Link>
                </p>
              </li>
            ))}
          </ul>

          <h2 className="mt-8 text-lg font-semibold">Speakers</h2>
          <ul className="mt-2 space-y-2">
            {data.speakers.map((speaker) => (
              <li key={speaker.id}>
                <Link
                  to="/speakers/$speakerId"
                  params={{ speakerId: speaker.id }}
                  className="underline"
                >
                  {speaker.name}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
