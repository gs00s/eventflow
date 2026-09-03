import type { LayoutComponent, Speaker } from '@eventflow/shared-types';
import { layoutComponentRegistry } from './registry';

export function LayoutRenderer({
  components,
  speakers,
}: {
  components: LayoutComponent[];
  speakers: Speaker[];
}) {
  return (
    <>
      {components.map((component) => {
        const Component = layoutComponentRegistry[component.type];
        // TS can't re-narrow `component` through the dynamic `component.type` lookup, though the registry's mapped type proves it matches.
        return <Component key={component.id} component={component as never} speakers={speakers} />;
      })}
    </>
  );
}
