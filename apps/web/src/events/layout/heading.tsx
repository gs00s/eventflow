import type { HeadingComponent } from '@eventflow/shared-types';

const sizeByLevel: Record<HeadingComponent['data']['level'], string> = {
  h1: 'text-2xl font-semibold',
  h2: 'text-xl font-semibold',
  h3: 'text-lg font-semibold',
  h4: 'text-base font-semibold',
  h5: 'text-sm font-semibold',
  h6: 'text-sm font-medium',
};

export function Heading({ component }: { component: HeadingComponent }) {
  const Tag = component.data.level;
  return <Tag className={sizeByLevel[component.data.level]}>{component.data.text}</Tag>;
}
