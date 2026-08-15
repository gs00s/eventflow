import * as z from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.url(),
  CORS_ORIGIN: z.url().default('http://localhost:7000'),
  PORT: z.coerce.number().default(9000),
});

type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export const env = new Proxy({} as Env, {
  get(_target, prop: keyof Env) {
    cached ??= envSchema.parse(process.env);
    return cached[prop];
  },
});
