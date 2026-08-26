import { Module } from '@nestjs/common';
import { makeCounterProvider, PrometheusModule } from '@willsoto/nestjs-prometheus';
import { env } from '../env';
import { DisabledMetricsController } from './disabled-metrics.controller';

export const eventsRequestsCounterProvider = makeCounterProvider({
  name: 'events_requests_total',
  help: 'Total requests to the events endpoints, by tier',
  labelNames: ['tier'],
});

@Module({
  imports: [
    PrometheusModule.register({
      controller: DisabledMetricsController,
      defaultLabels: { service: 'api', env: env.NODE_ENV },
    }),
  ],
  providers: [eventsRequestsCounterProvider],
  exports: [eventsRequestsCounterProvider],
})
export class MetricsModule {}
