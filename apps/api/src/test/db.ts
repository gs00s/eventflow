import { drizzle } from 'drizzle-orm/node-postgres';
import type { PgTable } from 'drizzle-orm/pg-core';
import { env } from '../env';

export async function clearTable(table: PgTable) {
  const db = drizzle(env.DATABASE_URL);
  await db.delete(table);
  await db.$client.end();
}
