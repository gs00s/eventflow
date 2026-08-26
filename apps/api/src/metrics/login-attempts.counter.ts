import { Counter } from 'prom-client';

// Plain prom-client Counter, not DI: auth.ts builds its config before Nest's container exists.
export const loginAttemptsCounter = new Counter({
  name: 'login_attempts_total',
  help: 'Total login attempts, by outcome',
  labelNames: ['status'],
});
