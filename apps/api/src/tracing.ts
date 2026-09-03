// Preloaded via `node -r ./dist/src/tracing.js` (Dockerfile CMD / package.json's `start` script) —
// instrumentation has to patch http/express/pg before the app's own `require` calls pull them
// in, so this can't live in main.ts or any Nest provider; those already run too late.
import 'dotenv/config';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { env } from './env';

const sdk = new NodeSDK({
  resource: defaultResource().merge(
    resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'api',
      'deployment.environment.name': env.NODE_ENV,
    }),
  ),
  traceExporter: new OTLPTraceExporter({
    url: `http://127.0.0.1:${env.DATADOG_OTLP_HTTP_PORT}/v1/traces`,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

process.on('SIGTERM', () => {
  void sdk.shutdown().finally(() => process.exit(0));
});
