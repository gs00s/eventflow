import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { fetchSpeaker } from '@/lib/api';

export function SpeakerDetail() {
  const { speakerId } = useParams({ from: '/speakers/$speakerId' });
  const { data, isLoading, isError } = useQuery({
    queryKey: ['speakers', speakerId],
    queryFn: () => fetchSpeaker(speakerId),
  });

  return (
    <div>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {isError && <p className="text-destructive">Failed to load speaker.</p>}
      {data && (
        <>
          <h1 className="text-2xl font-semibold">{data.name}</h1>
          <p className="mt-1 text-muted-foreground">{data.title}</p>
          <p className="mt-4">{data.bio}</p>

          <h2 className="mt-8 text-lg font-semibold">Events</h2>
          <ul className="mt-2 space-y-2">
            {data.events.map((event) => (
              <li key={event.id}>
                <Link to="/events/$eventId" params={{ eventId: event.id }} className="underline">
                  {event.title}
                </Link>
                <span className="ml-2 text-sm text-muted-foreground">{event.date}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
