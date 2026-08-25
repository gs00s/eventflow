import type { Params } from 'nestjs-pino';
import type { LoggerOptions } from 'pino';

export const pinoOptions: LoggerOptions = {
  // fast-redact paths — req.headers.cookie carries the Better Auth session token; the rest of
  // req/res.headers is just noise (user-agent, Helmet's CSP/HSTS dump, etc.), redacted the same
  // way as everything else.
  redact: ['req.headers', 'res.headers', '*.password', '*.token', '*.secret'],
  formatters: {
    // pino's own `level` field would otherwise be dropped entirely by this hook — keep both:
    // GCP Cloud Logging needs `severity` for its UI, other tooling (Datadog, pino-pretty) expects `level`.
    level(label, number) {
      return { severity: label.toUpperCase(), level: number };
    },
  },
};

export const pinoConfig: Params = {
  pinoHttp: pinoOptions,
};
