import { Counter } from 'prom-client';

// prom-client only types label values as plain string; this narrows them to a literal union too.
export function makeCounter<Labels extends Record<string, string>>(config: {
  name: string;
  help: string;
  labelNames: Extract<keyof Labels, string>[];
}) {
  const counter = new Counter<Extract<keyof Labels, string>>(config);

  return {
    inc: (labels: Labels) => counter.inc(labels),
    get: () => counter.get(),
  };
}
