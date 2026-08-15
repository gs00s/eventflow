import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { drizzle } from 'drizzle-orm/node-postgres';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { speakers } from './db/schemas/speakers';
import { env } from './env';

describe('App (integration)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const db = drizzle(env.DATABASE_URL);
    await db.delete(speakers);
    await db.insert(speakers).values({
      name: 'Dr. Jane Doe',
      title: 'VP of Engineering, Example Corp',
      bio: 'Expert in serverless architectures and cloud-native development.',
      image: '...',
    });
    await db.$client.end();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/speakers returns the seeded speakers from the database', async () => {
    const response = await request(app.getHttpServer()).get('/api/speakers');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([expect.objectContaining({ name: 'Dr. Jane Doe' })]);
  });
});
