import { useNavigate } from '@tanstack/react-router';
import { EventSearchForm } from './event-search-form';

export function Hero() {
  const navigate = useNavigate();

  return (
    <div className="mt-6 rounded-lg border border-border bg-muted/30 p-6">
      <h2 className="text-lg font-semibold">Find your next event</h2>
      <p className="mt-1 text-sm text-muted-foreground">Search by event name or description.</p>
      <div className="mt-4">
        <EventSearchForm
          onSubmit={(query) => void navigate({ to: '/search', search: { q: query } })}
        />
      </div>
    </div>
  );
}
