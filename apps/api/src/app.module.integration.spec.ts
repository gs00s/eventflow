import type { NestExpressApplication } from '@nestjs/platform-express';
import { drizzle } from 'drizzle-orm/node-postgres';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { speakers } from './db/schemas/speakers';
import { env } from './env';
import { createTestApp } from './test/app-harness';
import { speakerFactory } from './test/fixtures';

describe('App (integration)', () => {
  let app: NestExpressApplication;
  const speaker = speakerFactory.build();

  beforeAll(async () => {
    const db = drizzle(env.DATABASE_URL);
    await db.delete(speakers);
    await db.insert(speakers).values(speaker);
    await db.$client.end();

    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/speakers returns the seeded speakers from the database', async () => {
    const response = await request(app.getHttpServer()).get('/api/speakers');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([expect.objectContaining({ name: speaker.name })]);
  });
});
