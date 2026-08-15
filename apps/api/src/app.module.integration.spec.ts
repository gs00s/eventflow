import type { NestExpressApplication } from '@nestjs/platform-express';
import { drizzle } from 'drizzle-orm/node-postgres';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eventSessions } from './db/schemas/event-sessions';
import { events } from './db/schemas/events';
import { speakers } from './db/schemas/speakers';
import { env } from './env';
import { createTestApp } from './test/app-harness';
import { eventFactory, eventSessionFactory, speakerFactory } from './test/fixtures';

describe('App (integration)', () => {
  let app: NestExpressApplication;
  const speaker = speakerFactory.build();
  const event = eventFactory.build();
  const session = eventSessionFactory.build({ eventId: event.id, speakerId: speaker.id });

  beforeAll(async () => {
    const db = drizzle(env.DATABASE_URL);
    await db.delete(eventSessions);
    await db.delete(events);
    await db.delete(speakers);
    await db.insert(speakers).values(speaker);
    await db.insert(events).values(event);
    await db.insert(eventSessions).values(session);
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

  it('GET /api/speakers/:id returns the speaker detail with its linked events', async () => {
    const response = await request(app.getHttpServer()).get(`/api/speakers/${speaker.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      name: speaker.name,
      events: [expect.objectContaining({ id: event.id, title: event.title })],
    });
  });

  it('GET /api/speakers/:id returns 404 for an unknown speaker', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/speakers/00000000-0000-0000-0000-000000000000',
    );

    expect(response.status).toBe(404);
  });
});
