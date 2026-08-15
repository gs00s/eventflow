import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/lib/api';

export function Profile() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: fetchCurrentUser,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Profile</h1>
      {isLoading && <p className="mt-4 text-muted-foreground">Loading…</p>}
      {isError && <p className="mt-4 text-destructive">Failed to load your profile.</p>}
      {data && (
        <dl className="mt-4 space-y-2">
          <div>
            <dt className="text-sm text-muted-foreground">Name</dt>
            <dd>{data.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Email</dt>
            <dd>{data.email}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
