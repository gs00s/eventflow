import * as z from 'zod';

export const dbEnvSchema = z.object({
  DATABASE_URL: z.url(),
});

const envSchema = dbEnvSchema.extend({
  CORS_ORIGIN: z.url().default('http://localhost:7000'),
  PORT: z.coerce.number().default(9000),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url().default('http://localhost:9000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATADOG_LOG_TCP_PORT: z.coerce.number().default(10514),
  METRICS_PORT: z.coerce.number().default(9464),
});

type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export const env = new Proxy({} as Env, {
  get(_target, prop: keyof Env) {
    cached ??= envSchema.parse(process.env);
    return cached[prop];
  },
});
