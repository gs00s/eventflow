import type { NestExpressApplication } from '@nestjs/platform-express';
import { drizzle } from 'drizzle-orm/node-postgres';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eventSessions, events, speakers } from '../db/schemas';
import { env } from '../env';
import { createTestApp } from '../test/app-harness';
import { eventFactory, eventSessionFactory, speakerFactory } from '../test/fixtures';

describe('Events (integration)', () => {
  let app: NestExpressApplication;
  const event = eventFactory.build();
  const speaker = speakerFactory.build();
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

  it('GET /api/events returns the seeded events', async () => {
    const response = await request(app.getHttpServer()).get('/api/events');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([expect.objectContaining({ title: event.title })]);
  });

  it('GET /api/events/:id returns the event detail with its sessions and speakers', async () => {
    const response = await request(app.getHttpServer()).get(`/api/events/${event.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      title: event.title,
      description: event.description,
      sessions: [
        expect.objectContaining({
          title: session.title,
          speaker: expect.objectContaining({ id: speaker.id }),
        }),
      ],
      speakers: [expect.objectContaining({ id: speaker.id, name: speaker.name })],
    });
  });

  it('GET /api/events/:id returns 404 for an unknown event', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/events/00000000-0000-0000-0000-000000000000',
    );

    expect(response.status).toBe(404);
  });
});
