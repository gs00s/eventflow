import type { SpeakerListComponent } from '@eventflow/shared-types';
import { SpeakerCard } from './speaker-card';

export function SpeakerList({ component }: { component: SpeakerListComponent }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{component.data.title}</h2>
      <ul className="mt-2 space-y-2">
        {component.components.map((card) => (
          <SpeakerCard key={card.id} component={card} />
        ))}
      </ul>
    </div>
  );
}
