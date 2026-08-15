import { Link } from '@tanstack/react-router';
import type { Event } from '@eventflow/shared-types';

export function EventListItem({ event }: { event: Event }) {
  return (
    <li>
      <Link to="/events/$eventId" params={{ eventId: event.id }} className="underline">
        {event.title}
      </Link>
      {event.isVip && (
        <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
          VIP
        </span>
      )}
      <p className="text-sm text-muted-foreground">
        {event.date} · {event.location.city}
      </p>
    </li>
  );
}
