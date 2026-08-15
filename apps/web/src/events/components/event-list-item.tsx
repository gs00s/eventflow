import { Link } from '@tanstack/react-router';
import type { Event } from '@eventflow/shared-types';

export function EventListItem({ event }: { event: Event }) {
  return (
    <li>
      <Link to="/events/$eventId" params={{ eventId: event.id }} className="underline">
        {event.title}
      </Link>
      <p className="text-sm text-muted-foreground">
        {event.date} · {event.location.city}
      </p>
    </li>
  );
}
