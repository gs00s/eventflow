import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { PinoLogger } from 'nestjs-pino';
import { db } from '../db/connection';
import { env } from '../env';
import * as schema from '../db/schemas';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.CORS_ORIGIN],
  logger: {
    // PinoLogger.root is a static accessor, not DI-injected — this module loads (and this
    // config object is built) before Nest's container exists, but the callback itself only
    // runs later, once a real request triggers a Better Auth log line, by which point the
    // app has fully bootstrapped.
    log: (level, message, ...args) => {
      const context = args.length > 0 ? { context: 'BetterAuth', args } : { context: 'BetterAuth' };
      PinoLogger.root[level](context, message);
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      isVip: {
        type: 'boolean',
        input: false,
      },
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    // Overrides Better Auth's built-in 3-req/10s default on these paths, loosened for test headroom.
    customRules: {
      '/sign-in/email': { window: 10, max: 5 },
      '/sign-up/email': { window: 10, max: 10 },
    },
  },
});
