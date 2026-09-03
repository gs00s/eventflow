import { Link } from '@tanstack/react-router';
import type { SpeakerCardComponent, Speaker } from '@eventflow/shared-types';

export function SpeakerCard({
  component,
  speakers,
}: {
  component: SpeakerCardComponent;
  speakers: Speaker[];
}) {
  const speaker = speakers.find((candidate) => candidate.id === component.data.id);
  if (!speaker) return null;

  return (
    <li>
      <p className="font-medium">
        <Link to="/speakers/$speakerId" params={{ speakerId: speaker.id }} className="underline">
          {speaker.name}
        </Link>
      </p>
      <p className="text-sm text-muted-foreground">{speaker.title}</p>
    </li>
  );
}
