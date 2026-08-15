import type { LayoutComponent } from '@eventflow/shared-types';
import { layoutComponentRegistry } from './registry';

export function LayoutRenderer({ components }: { components: LayoutComponent[] }) {
  return (
    <>
      {components.map((component) => {
        const Component = layoutComponentRegistry[component.type];
        // The registry's mapped type already proves every `type` maps to a
        // component accepting that exact narrowed shape; TS just can't see
        // through the dynamic `component.type` lookup to re-narrow `component`
        // itself at this call site.
        return <Component key={component.id} component={component as never} />;
      })}
    </>
  );
}
