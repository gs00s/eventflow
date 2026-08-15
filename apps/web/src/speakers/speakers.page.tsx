import { useQuery } from '@tanstack/react-query';
import { fetchSpeakers } from '@/lib/api';
import { SpeakerListItem } from './components/speaker-list-item';

export function SpeakersPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['speakers'],
    queryFn: fetchSpeakers,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Speakers</h1>
      {isLoading && <p className="mt-4 text-muted-foreground">Loading…</p>}
      {isError && <p className="mt-4 text-destructive">Failed to load speakers.</p>}
      {data && (
        <ul className="mt-4 space-y-2">
          {data.map((speaker) => (
            <SpeakerListItem key={speaker.id} speaker={speaker} />
          ))}
        </ul>
      )}
    </div>
  );
}
