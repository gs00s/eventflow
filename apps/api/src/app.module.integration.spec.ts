import type { NestExpressApplication } from '@nestjs/platform-express';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eventSessions } from './db/schemas/event-sessions';
import { events } from './db/schemas/events';
import { speakers } from './db/schemas/speakers';
import { user } from './db/schemas/user';
import { env } from './env';
import { createTestApp } from './test/app-harness';
import { eventFactory, eventSessionFactory, speakerFactory } from './test/fixtures';

describe('App (integration)', () => {
  let app: NestExpressApplication;
  const speaker = speakerFactory.build();
  const event = eventFactory.build();
  const vipEvent = eventFactory.build({ isVip: true });
  const session = eventSessionFactory.build({ eventId: event.id, speakerId: speaker.id });
  const vipSession = eventSessionFactory.build({ eventId: vipEvent.id, speakerId: speaker.id });

  beforeAll(async () => {
    const db = drizzle(env.DATABASE_URL);
    await db.delete(eventSessions);
    await db.delete(events);
    await db.delete(speakers);
    await db.insert(speakers).values(speaker);
    await db.insert(events).values([event, vipEvent]);
    await db.insert(eventSessions).values([session, vipSession]);
    await db.$client.end();

    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function vipAgent() {
    const agent = request.agent(app.getHttpServer());
    const email = `vip-speakers-${Date.now()}@example.com`;
    await agent
      .post('/api/auth/sign-up/email')
      .send({ email, password: 'password1234', name: 'VIP Viewer' });

    const db = drizzle(env.DATABASE_URL);
    await db.update(user).set({ isVip: true }).where(eq(user.email, email));
    await db.$client.end();

    return agent;
  }

  it('GET /api/speakers returns the seeded speakers from the database', async () => {
    const response = await request(app.getHttpServer()).get('/api/speakers');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([expect.objectContaining({ name: speaker.name })]);
  });

  it('GET /api/speakers/:id returns the speaker', async () => {
    const response = await request(app.getHttpServer()).get(`/api/speakers/${speaker.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ name: speaker.name });
  });

  it('GET /api/speakers/:id returns 404 for an unknown speaker', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/speakers/00000000-0000-0000-0000-000000000000',
    );

    expect(response.status).toBe(404);
  });

  it('GET /api/speakers/:id/events returns only the speaker’s non-VIP events', async () => {
    const response = await request(app.getHttpServer()).get(`/api/speakers/${speaker.id}/events`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([expect.objectContaining({ id: event.id, title: event.title })]);
  });

  it('GET /api/speakers/:id/events returns 404 for an unknown speaker', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/speakers/00000000-0000-0000-0000-000000000000/events',
    );

    expect(response.status).toBe(404);
  });

  it('GET /api/speakers/:id/events/vip returns 401 when unauthenticated', async () => {
    const response = await request(app.getHttpServer()).get(
      `/api/speakers/${speaker.id}/events/vip`,
    );

    expect(response.status).toBe(401);
  });

  it('GET /api/speakers/:id/events/vip returns 403 for a signed-in non-VIP user', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/sign-up/email').send({
      email: `non-vip-speakers-${Date.now()}@example.com`,
      password: 'password1234',
      name: 'Regular',
    });

    const response = await agent.get(`/api/speakers/${speaker.id}/events/vip`);

    expect(response.status).toBe(403);
  });

  it('GET /api/speakers/:id/events/vip returns every event, including VIP ones, for a VIP user', async () => {
    const agent = await vipAgent();

    const response = await agent.get(`/api/speakers/${speaker.id}/events/vip`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: event.id }),
        expect.objectContaining({ id: vipEvent.id }),
      ]),
    );
  });
});
