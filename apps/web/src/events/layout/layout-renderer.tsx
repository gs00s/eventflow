import type { LayoutComponent } from '@eventflow/shared-types';
import { layoutComponentRegistry } from './registry';

export function LayoutRenderer({ components }: { components: LayoutComponent[] }) {
  return (
    <>
      {components.map((component) => {
        const Component = layoutComponentRegistry[component.type];
        // TS can't re-narrow `component` through the dynamic `component.type` lookup, though the registry's mapped type proves it matches.
        return <Component key={component.id} component={component as never} />;
      })}
    </>
  );
}
