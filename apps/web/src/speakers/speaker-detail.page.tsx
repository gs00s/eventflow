import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { fetchSpeaker } from '@/lib/api';
import { SpeakerEventList } from './components/speaker-event-list';

export function SpeakerDetailPage() {
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
          <SpeakerEventList events={data.events} />
        </>
      )}
    </div>
  );
}
