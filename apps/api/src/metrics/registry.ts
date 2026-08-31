import { collectDefaultMetrics, register } from 'prom-client';
import { env } from '../env';

collectDefaultMetrics();
register.setDefaultLabels({ service: 'api', env: env.NODE_ENV });

export { register };
