import { drizzle } from 'drizzle-orm/node-postgres';
import { dbEnvSchema } from '../env';
import * as schema from './schemas';

const { DATABASE_URL } = dbEnvSchema.parse(process.env);

export const db = drizzle(DATABASE_URL, { schema });
