import pino from 'pino';
import type { Params } from 'nestjs-pino';
import type { LoggerOptions } from 'pino';
import { env } from '../env';

export const pinoOptions: LoggerOptions = {
  // fast-redact paths — req.headers.cookie carries the Better Auth session token; the rest of
  // req/res.headers is just noise (user-agent, Helmet's CSP/HSTS dump, etc.), redacted the same
  // way as everything else.
  redact: ['req.headers', 'res.headers', '*.password', '*.token', '*.secret'],
  base: { service: 'api', env: env.NODE_ENV },
  formatters: {
    // pino's own `level` field would otherwise be dropped entirely by this hook — keep both:
    // GCP Cloud Logging needs `severity` for its UI, other tooling (Datadog, pino-pretty) expects `level`.
    level(label, number) {
      return { severity: label.toUpperCase(), level: number };
    },
  },
};

// Fans out to stdout and the Datadog Agent's TCP log source; skipped in tests, no agent to reach.
function createPinoDestination() {
  return pino.transport({
    targets: [
      { target: 'pino/file', options: { destination: 1 } },
      {
        target: 'pino-socket',
        options: {
          address: '127.0.0.1',
          port: env.DATADOG_LOG_TCP_PORT,
          mode: 'tcp',
          reconnect: true,
          recovery: true,
        },
      },
    ],
  });
}

export const pinoConfig: Params = {
  pinoHttp: env.NODE_ENV === 'test' ? pinoOptions : [pinoOptions, createPinoDestination()],
};
