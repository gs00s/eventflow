import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { dbEnvSchema } from './src/env';

const { DATABASE_URL } = dbEnvSchema.parse(process.env);

export default defineConfig({
  out: './src/db/migrations',
  schema: './src/db/schemas/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: DATABASE_URL,
  },
});
