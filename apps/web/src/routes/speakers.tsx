import { useQuery } from '@tanstack/react-query';
import { fetchSpeakers } from '@/lib/api';

export function Speakers() {
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
            <li key={speaker.id}>{speaker.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
