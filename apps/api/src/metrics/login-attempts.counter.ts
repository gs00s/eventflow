import { makeCounter } from './typed-counter';
import './registry';

export const loginAttemptsCounter = makeCounter<{ status: 'success' | 'failure' }>({
  name: 'login_attempts_total',
  help: 'Total login attempts, by outcome',
  labelNames: ['status'],
});
