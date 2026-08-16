import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { fetchSpeaker, fetchSpeakerEvents, fetchSpeakerEventsVip } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { SpeakerEventList } from './components/speaker-event-list';

export function SpeakerDetailPage() {
  const { speakerId } = useParams({ from: '/speakers/$speakerId' });
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const isVip = session?.user.isVip ?? false;

  const speakerQuery = useQuery({
    queryKey: ['speakers', speakerId],
    queryFn: () => fetchSpeaker(speakerId),
  });

  const eventsQuery = useQuery({
    queryKey: ['speakers', speakerId, 'events', { isVip }],
    queryFn: () => (isVip ? fetchSpeakerEventsVip(speakerId) : fetchSpeakerEvents(speakerId)),
    enabled: !isSessionPending,
  });

  return (
    <div>
      {(speakerQuery.isLoading || isSessionPending) && (
        <p className="text-muted-foreground">Loading…</p>
      )}
      {speakerQuery.isError && <p className="text-destructive">Failed to load speaker.</p>}
      {speakerQuery.data && (
        <>
          <h1 className="text-2xl font-semibold">{speakerQuery.data.name}</h1>
          <p className="mt-1 text-muted-foreground">{speakerQuery.data.title}</p>
          <p className="mt-4">{speakerQuery.data.bio}</p>

          <h2 className="mt-8 text-lg font-semibold">Events</h2>
          {eventsQuery.data && <SpeakerEventList events={eventsQuery.data} />}
        </>
      )}
    </div>
  );
}
