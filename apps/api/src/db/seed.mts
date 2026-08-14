import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { speakerSchema } from '@eventflow/shared-types';
import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from '../env.ts';
import { speakers } from './schemas/speakers.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mockPath = resolve(__dirname, './seeds/speakers.mock.json');

async function seed() {
  const raw = JSON.parse(readFileSync(mockPath, 'utf8'));
  const data = speakerSchema.array().parse(raw);

  const db = drizzle(env.DATABASE_URL);
  await db.insert(speakers).values(data).onConflictDoNothing();
  await db.$client.end();

  console.log(`Seeded ${data.length} speaker(s).`);
}

void seed();
