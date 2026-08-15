import { Link } from '@tanstack/react-router';
import type { SessionCardComponent } from '@eventflow/shared-types';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function SessionCard({ component }: { component: SessionCardComponent }) {
  const { data } = component;

  return (
    <li>
      <p className="font-medium">{data.title}</p>
      <p className="text-sm text-muted-foreground">{data.subtitle}</p>
      <p className="text-sm text-muted-foreground">
        {formatTime(data.from)}–{formatTime(data.to)} · {data.room} ·{' '}
        <Link
          to="/speakers/$speakerId"
          params={{ speakerId: data.speaker.id }}
          className="underline"
        >
          {data.speaker.name}
        </Link>
      </p>
    </li>
  );
}
