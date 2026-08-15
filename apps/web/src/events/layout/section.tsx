import type { SectionComponent } from '@eventflow/shared-types';
import { LayoutRenderer } from './layout-renderer';

export function Section({ component }: { component: SectionComponent }) {
  return (
    <div
      className={component.data.direction === 'row' ? 'flex flex-row gap-4' : 'flex flex-col gap-4'}
    >
      <LayoutRenderer components={component.components} />
    </div>
  );
}
