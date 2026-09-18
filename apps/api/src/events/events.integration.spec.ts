import type { NestExpressApplication } from '@nestjs/platform-express';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eventSessions, events, layouts, registrations, speakers, user } from '../db/schemas';
import { env } from '../env';
import { createTestApp } from '../test/app-harness';
import {
  eventFactory,
  eventSessionFactory,
  layoutFactory,
  speakerFactory,
  userFactory,
} from '../test/fixtures';

describe('Events (integration)', () => {
  let app: NestExpressApplication;
  let actorAgent: ReturnType<typeof request.agent>;
  const actorEmail = `actor-${Date.now()}@example.com`;
  const owner = userFactory.build();
  const layout = layoutFactory.build();
  const event = eventFactory.build({ ownerId: owner.id, layoutId: layout.id });
  const vipEvent = eventFactory.build({ ownerId: owner.id, isVip: true });
  const searchableEvent = eventFactory.build({
    ownerId: owner.id,
    title: 'Kubernetes Deep Dive Workshop',
  });
  const searchableVipEvent = eventFactory.build({
    ownerId: owner.id,
    isVip: true,
    description: 'An exclusive session on kubernetes adoption at scale.',
  });
  const speaker = speakerFactory.build();
  const session = eventSessionFactory.build({ eventId: event.id, speakerId: speaker.id });

  beforeAll(async () => {
    const db = drizzle(env.DATABASE_URL);
    await db.delete(registrations);
    await db.delete(eventSessions);
    await db.delete(events);
    await db.delete(layouts);
    await db.delete(speakers);
    await db.insert(user).values(owner);
    await db.insert(speakers).values(speaker);
    await db.insert(layouts).values(layout);
    await db.insert(events).values([event, vipEvent, searchableEvent, searchableVipEvent]);
    await db.insert(eventSessions).values(session);
    await db.$client.end();

    app = await createTestApp();

    // Shared across the my-events tests below (rather than one sign-up per test) to stay
    // under better-auth's sign-up rate limit (10 per 10s), which this file's existing
    // registrant/VIP agents already use in full within a single fast test run.
    actorAgent = request.agent(app.getHttpServer());
    await actorAgent.post('/api/auth/sign-up/email').send({
      email: actorEmail,
      password: 'password1234',
      name: 'Actor',
    });
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

  async function registrantAgent() {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/sign-up/email').send({
      email: `registrant-${Date.now()}@example.com`,
      password: 'password1234',
      name: 'Registrant',
    });

    return agent;
  }

  function validEventInput(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      title: 'Kubernetes Deep Dive Workshop',
      subtitle: 'Hands-on container orchestration',
      description: 'Hands-on container orchestration for platform teams.',
      date: '2026-03-15',
      location: {
        city: 'Austin',
        venue: 'Austin Convention Center',
        address: '500 E Cesar Chavez St',
      },
      organizer: { name: 'Snapsoft', image: '...' },
      hero: { image: '...', cta: 'Register Now' },
      isVip: false,
      ...overrides,
    };
  }

  it('GET /api/events returns only non-VIP events', async () => {
    const response = await request(app.getHttpServer()).get('/api/events');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: event.title })]),
    );
    expect(response.body).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: vipEvent.id })]),
    );
  });

  it('GET /api/events?q= filters non-VIP events by a title/description match', async () => {
    const response = await request(app.getHttpServer()).get('/api/events?q=kubernetes');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([expect.objectContaining({ id: searchableEvent.id })]);
  });

  it('GET /api/events?q= returns an empty array when nothing matches', async () => {
    const response = await request(app.getHttpServer()).get('/api/events?q=nonexistent-term-xyz');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('GET /api/events/vip?q= filters every event by a title/description match for a VIP user', async () => {
    const agent = await vipAgent();

    const response = await agent.get('/api/events/vip?q=kubernetes');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: searchableEvent.id }),
        expect.objectContaining({ id: searchableVipEvent.id }),
      ]),
    );
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

  it('POST /api/events/:id/register returns 401 when unauthenticated', async () => {
    const response = await request(app.getHttpServer()).post(`/api/events/${event.id}/register`);

    expect(response.status).toBe(401);
  });

  it('POST /api/events/:id/register returns 404 for an unknown event', async () => {
    const response = await actorAgent.post(
      '/api/events/00000000-0000-0000-0000-000000000000/register',
    );

    expect(response.status).toBe(404);
  });

  it('POST /api/events/:id/register returns 409 for an already-registered viewer', async () => {
    const agent = await registrantAgent();
    await agent.post(`/api/events/${event.id}/register`);

    const response = await agent.post(`/api/events/${event.id}/register`);

    expect(response.status).toBe(409);
  });

  it('GET /api/events/:id/register returns 401 when unauthenticated', async () => {
    const response = await request(app.getHttpServer()).get(`/api/events/${event.id}/register`);

    expect(response.status).toBe(401);
  });

  it('GET /api/events/:id/register reports isRegistered false before registering, then true after', async () => {
    const agent = await registrantAgent();

    const before = await agent.get(`/api/events/${event.id}/register`);
    await agent.post(`/api/events/${event.id}/register`);
    const after = await agent.get(`/api/events/${event.id}/register`);

    expect(before.body).toEqual({ isRegistered: false });
    expect(after.body).toEqual({ isRegistered: true });
  });

  it('DELETE /api/events/:id/register returns 401 when unauthenticated', async () => {
    const response = await request(app.getHttpServer()).delete(`/api/events/${event.id}/register`);

    expect(response.status).toBe(401);
  });

  it('DELETE /api/events/:id/register returns 404 when the viewer is not registered', async () => {
    const agent = await registrantAgent();

    const response = await agent.delete(`/api/events/${event.id}/register`);

    expect(response.status).toBe(404);
  });

  it('removes an existing registration and reflects it on the next GET /api/events/:id/register', async () => {
    const agent = await registrantAgent();
    await agent.post(`/api/events/${event.id}/register`);

    const deleteResponse = await agent.delete(`/api/events/${event.id}/register`);
    const statusResponse = await agent.get(`/api/events/${event.id}/register`);

    expect(deleteResponse.status).toBe(200);
    expect(statusResponse.body).toEqual({ isRegistered: false });
  });

  it('GET /api/events/mine returns 401 when unauthenticated', async () => {
    const response = await request(app.getHttpServer()).get('/api/events/mine');

    expect(response.status).toBe(401);
  });

  it('GET /api/events/mine/:id returns 404 for an unknown event', async () => {
    const response = await actorAgent.get('/api/events/mine/00000000-0000-0000-0000-000000000000');

    expect(response.status).toBe(404);
  });

  it('GET /api/events/mine/:id returns 403 for an event owned by someone else', async () => {
    const response = await actorAgent.get(`/api/events/mine/${event.id}`);

    expect(response.status).toBe(403);
  });

  it('POST /api/events returns 401 when unauthenticated', async () => {
    const response = await request(app.getHttpServer()).post('/api/events').send(validEventInput());

    expect(response.status).toBe(401);
  });

  it('POST /api/events returns 400 for an invalid body', async () => {
    const response = await actorAgent.post('/api/events').send(validEventInput({ title: '' }));

    expect(response.status).toBe(400);
  });

  it('POST /api/events forces isVip false for a non-VIP owner even if isVip:true is submitted', async () => {
    const response = await actorAgent.post('/api/events').send(validEventInput({ isVip: true }));

    expect(response.status).toBe(201);
    expect(response.body.isVip).toBe(false);
  });

  it('GET /api/events/mine returns only events owned by the caller, VIP included', async () => {
    const created = await actorAgent.post('/api/events').send(validEventInput());
    const db = drizzle(env.DATABASE_URL);
    await db.update(events).set({ isVip: true }).where(eq(events.id, created.body.id));
    await db.$client.end();

    const response = await actorAgent.get('/api/events/mine');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.body.id, isVip: true })]),
    );
  });

  it('GET /api/events/mine/:id returns the event detail for its owner', async () => {
    const created = await actorAgent.post('/api/events').send(validEventInput());

    const response = await actorAgent.get(`/api/events/mine/${created.body.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: created.body.id, title: validEventInput().title });
  });

  it('PATCH /api/events/:id returns 401 when unauthenticated', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/events/${event.id}`)
      .send(validEventInput());

    expect(response.status).toBe(401);
  });

  it('PATCH /api/events/:id returns 403 for an event owned by someone else', async () => {
    const response = await actorAgent.patch(`/api/events/${event.id}`).send(validEventInput());

    expect(response.status).toBe(403);
  });

  it('PATCH /api/events/:id returns 404 for an unknown event', async () => {
    const response = await actorAgent
      .patch('/api/events/00000000-0000-0000-0000-000000000000')
      .send(validEventInput());

    expect(response.status).toBe(404);
  });

  it('PATCH /api/events/:id updates the event for its owner', async () => {
    const created = await actorAgent.post('/api/events').send(validEventInput());

    const response = await actorAgent
      .patch(`/api/events/${created.body.id}`)
      .send(validEventInput({ title: 'Updated Title' }));

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Updated Title');
  });

  it('DELETE /api/events/:id returns 401 when unauthenticated', async () => {
    const response = await request(app.getHttpServer()).delete(`/api/events/${event.id}`);

    expect(response.status).toBe(401);
  });

  it('DELETE /api/events/:id returns 403 for an event owned by someone else', async () => {
    const response = await actorAgent.delete(`/api/events/${event.id}`);

    expect(response.status).toBe(403);
  });

  it('DELETE /api/events/:id deletes the event for its owner', async () => {
    const created = await actorAgent.post('/api/events').send(validEventInput());

    const deleteResponse = await actorAgent.delete(`/api/events/${created.body.id}`);
    const getResponse = await actorAgent.get(`/api/events/mine/${created.body.id}`);

    expect(deleteResponse.status).toBe(200);
    expect(getResponse.status).toBe(404);
  });

  it('POST /api/events honors isVip:true for a VIP owner', async () => {
    const db = drizzle(env.DATABASE_URL);
    await db.update(user).set({ isVip: true }).where(eq(user.email, actorEmail));
    await db.$client.end();

    const response = await actorAgent.post('/api/events').send(validEventInput({ isVip: true }));

    expect(response.status).toBe(201);
    expect(response.body.isVip).toBe(true);
  });
});
