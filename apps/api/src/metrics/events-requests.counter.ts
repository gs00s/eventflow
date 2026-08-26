import { makeCounter } from './typed-counter';
import './registry';

export const eventsRequestsCounter = makeCounter<{ tier: 'standard' | 'vip' }>({
  name: 'events_requests_total',
  help: 'Total requests to the events endpoints, by tier',
  labelNames: ['tier'],
});
