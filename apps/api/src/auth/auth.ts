import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from '../env';
import * as schema from '../db/schemas';

export const auth = betterAuth({
  database: drizzleAdapter(drizzle(env.DATABASE_URL, { schema }), { provider: 'pg', schema }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: true,
  },
});
