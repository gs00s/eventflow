import type { ParagraphComponent } from '@eventflow/shared-types';

export function Paragraph({ component }: { component: ParagraphComponent }) {
  return <p className="mt-2 whitespace-pre-line">{component.data.text}</p>;
}
