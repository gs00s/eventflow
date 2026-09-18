import { Link } from '@tanstack/react-router';
import type { OwnedEvent } from '@eventflow/shared-types';
import { buttonVariants } from '@/components/ui/button';
import { DeleteEventDialog } from './delete-event-dialog';

export function OwnedEventListItem({ event }: { event: OwnedEvent }) {
  return (
    <li className="flex items-center justify-between gap-4">
      <div>
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
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          to="/events/$eventId/edit"
          params={{ eventId: event.id }}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Edit
        </Link>
        <DeleteEventDialog eventId={event.id} eventTitle={event.title} />
      </div>
    </li>
  );
}
