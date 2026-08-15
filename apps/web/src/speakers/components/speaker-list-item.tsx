import { Link } from '@tanstack/react-router';
import type { Speaker } from '@eventflow/shared-types';

export function SpeakerListItem({ speaker }: { speaker: Speaker }) {
  return (
    <li>
      <Link to="/speakers/$speakerId" params={{ speakerId: speaker.id }} className="underline">
        {speaker.name}
      </Link>
    </li>
  );
}
