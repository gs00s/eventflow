import type { SpeakerCardComponent } from '@eventflow/shared-types';

export function SpeakerCard({ component }: { component: SpeakerCardComponent }) {
  return (
    <li>
      <p className="font-medium">{component.data.name}</p>
      <p className="text-sm text-muted-foreground">{component.data.title}</p>
    </li>
  );
}
