import { Link } from '@tanstack/react-router';
import type { SpeakerEvent } from '@eventflow/shared-types';

export function SpeakerEventList({ events }: { events: SpeakerEvent[] }) {
  return (
    <ul className="mt-2 space-y-2">
      {events.map((event) => (
        <li key={event.id}>
          <Link to="/events/$eventId" params={{ eventId: event.id }} className="underline">
            {event.title}
          </Link>
          <span className="ml-2 text-sm text-muted-foreground">{event.date}</span>
        </li>
      ))}
    </ul>
  );
}
