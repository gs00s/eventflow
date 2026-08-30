import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { pinoOptions } from './pino.config';

function loggerWithCapture() {
  const lines: string[] = [];
  const stream = { write: (line: string) => lines.push(line) };
  const logger = pino(pinoOptions, stream);

  return { logger, lines };
}

describe('pinoConfig', () => {
  it('maps level to both severity and level, matching GCP Cloud Logging expectations', () => {
    const { logger, lines } = loggerWithCapture();

    logger.warn('something happened');
    const logged = JSON.parse(lines[0]);

    expect(logged.severity).toBe('WARN');
    expect(logged.level).toBe(40);
  });

  it('redacts all request headers, including the cookie carrying the session token', () => {
    const { logger, lines } = loggerWithCapture();

    logger.info(
      { req: { headers: { cookie: 'better-auth.session=super-secret', 'user-agent': 'test' } } },
      'request received',
    );
    const logged = JSON.parse(lines[0]);

    expect(logged.req.headers).toBe('[Redacted]');
  });

  it('redacts all response headers', () => {
    const { logger, lines } = loggerWithCapture();

    logger.info(
      { res: { headers: { 'content-security-policy': "default-src 'self'" } } },
      'request completed',
    );
    const logged = JSON.parse(lines[0]);

    expect(logged.res.headers).toBe('[Redacted]');
  });

  it('redacts a nested password field', () => {
    const { logger, lines } = loggerWithCapture();

    logger.info({ body: { password: 'hunter2' } }, 'sign-up attempt');
    const logged = JSON.parse(lines[0]);

    expect(logged.body.password).toBe('[Redacted]');
  });

  it('tags every line with the service and env, for Datadog unified tagging', () => {
    const { logger, lines } = loggerWithCapture();

    logger.info('something happened');
    const logged = JSON.parse(lines[0]);

    expect(logged.service).toBe('api');
    expect(logged.env).toBe('test');
  });
});
