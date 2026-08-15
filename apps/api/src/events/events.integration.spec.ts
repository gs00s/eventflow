import type { NestExpressApplication } from '@nestjs/platform-express';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eventSessions, events, layouts, speakers, user } from '../db/schemas';
import { env } from '../env';
import { createTestApp } from '../test/app-harness';
import { eventFactory, eventSessionFactory, layoutFactory, speakerFactory } from '../test/fixtures';

describe('Events (integration)', () => {
  let app: NestExpressApplication;
  const layout = layoutFactory.build();
  const event = eventFactory.build({ layoutId: layout.id });
  const vipEvent = eventFactory.build({ isVip: true });
  const speaker = speakerFactory.build();
  const session = eventSessionFactory.build({ eventId: event.id, speakerId: speaker.id });

  beforeAll(async () => {
    const db = drizzle(env.DATABASE_URL);
    await db.delete(eventSessions);
    await db.delete(events);
    await db.delete(layouts);
    await db.delete(speakers);
    await db.insert(speakers).values(speaker);
    await db.insert(layouts).values(layout);
    await db.insert(events).values([event, vipEvent]);
    await db.insert(eventSessions).values(session);
    await db.$client.end();

    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function vipAgent() {
    const agent = request.agent(app.getHttpServer());
    const email = `vip-${Date.now()}@example.com`;
    await agent
      .post('/api/auth/sign-up/email')
      .send({ email, password: 'password1234', name: 'VIP Viewer' });

    const db = drizzle(env.DATABASE_URL);
    await db.update(user).set({ isVip: true }).where(eq(user.email, email));
    await db.$client.end();

    return agent;
  }

  it('GET /api/events returns only non-VIP events', async () => {
    const response = await request(app.getHttpServer()).get('/api/events');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([expect.objectContaining({ title: event.title })]);
  });

  it('GET /api/events/:id returns the event detail with its sessions, speakers, and layout', async () => {
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
      layout: { id: layout.id, components: layout.components },
    });
  });

  it('GET /api/events/:id returns 404 for an unknown event', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/events/00000000-0000-0000-0000-000000000000',
    );

    expect(response.status).toBe(404);
  });

  it('GET /api/events/:id returns 403 for a VIP event regardless of caller', async () => {
    const response = await request(app.getHttpServer()).get(`/api/events/${vipEvent.id}`);

    expect(response.status).toBe(403);
  });

  it('GET /api/events/vip returns 401 when unauthenticated', async () => {
    const response = await request(app.getHttpServer()).get('/api/events/vip');

    expect(response.status).toBe(401);
  });

  it('GET /api/events/vip returns 403 for a signed-in non-VIP user', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/sign-up/email').send({
      email: `non-vip-${Date.now()}@example.com`,
      password: 'password1234',
      name: 'Regular',
    });

    const response = await agent.get('/api/events/vip');

    expect(response.status).toBe(403);
  });

  it('GET /api/events/vip returns every event, including VIP ones, for a VIP user', async () => {
    const agent = await vipAgent();

    const response = await agent.get('/api/events/vip');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: event.id }),
        expect.objectContaining({ id: vipEvent.id }),
      ]),
    );
  });

  it('GET /api/events/vip/:id returns the VIP event detail for a VIP user', async () => {
    const agent = await vipAgent();

    const response = await agent.get(`/api/events/vip/${vipEvent.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: vipEvent.id, title: vipEvent.title });
  });

  it('GET /api/events/vip/:id returns 403 for a signed-in non-VIP user', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/sign-up/email').send({
      email: `non-vip-2-${Date.now()}@example.com`,
      password: 'password1234',
      name: 'Regular',
    });

    const response = await agent.get(`/api/events/vip/${vipEvent.id}`);

    expect(response.status).toBe(403);
  });
});
