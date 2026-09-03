import type { SectionComponent, Speaker } from '@eventflow/shared-types';
import { LayoutRenderer } from './layout-renderer';

export function Section({
  component,
  speakers,
}: {
  component: SectionComponent;
  speakers: Speaker[];
}) {
  return (
    <div
      className={component.data.direction === 'row' ? 'flex flex-row gap-4' : 'flex flex-col gap-4'}
    >
      <LayoutRenderer components={component.components} speakers={speakers} />
    </div>
  );
}
