import type { SessionScheduleComponent } from '@eventflow/shared-types';
import { SessionCard } from './session-card';

export function SessionSchedule({ component }: { component: SessionScheduleComponent }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{component.data.title}</h2>
      <ul className="mt-2 space-y-3">
        {component.components.map((card) => (
          <SessionCard key={card.id} component={card} />
        ))}
      </ul>
    </div>
  );
}
