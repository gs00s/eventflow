import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { user } from '../db/schemas';
import { createTestApp } from '../test/app-harness';
import { clearTable } from '../test/db';

describe('Auth (integration)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    await clearTable(user);
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/sign-up/email (register)', () => {
    it('creates a new user and starts a session', async () => {
      const agent = request.agent(app.getHttpServer());

      const response = await agent.post('/api/auth/sign-up/email').send({
        email: 'register-happy@example.com',
        password: 'password1234',
        name: 'Register Happy',
      });

      expect(response.status).toBe(200);
      expect(response.body.user).toMatchObject({
        email: 'register-happy@example.com',
        name: 'Register Happy',
      });

      const me = await agent.get('/api/users/me');

      expect(me.status).toBe(200);
    });

    it('rejects a duplicate email', async () => {
      const credentials = {
        email: 'register-dup@example.com',
        password: 'password1234',
        name: 'Dup',
      };
      await request(app.getHttpServer()).post('/api/auth/sign-up/email').send(credentials);

      const response = await request(app.getHttpServer())
        .post('/api/auth/sign-up/email')
        .send(credentials);

      expect(response.status).toBe(422);
    });

    it('rejects a password shorter than the minimum length', async () => {
      const response = await request(app.getHttpServer()).post('/api/auth/sign-up/email').send({
        email: 'register-shortpw@example.com',
        password: 'short',
        name: 'Short Password',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/sign-in/email (login)', () => {
    const credentials = { email: 'login-user@example.com', password: 'password1234' };

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/api/auth/sign-up/email')
        .send({ ...credentials, name: 'Login User' });
    });

    it('starts a session for correct credentials', async () => {
      const agent = request.agent(app.getHttpServer());

      const response = await agent.post('/api/auth/sign-in/email').send(credentials);

      expect(response.status).toBe(200);

      const me = await agent.get('/api/users/me');

      expect(me.status).toBe(200);
      expect(me.body).toEqual({
        id: expect.any(String),
        email: credentials.email,
        name: 'Login User',
      });
    });

    it('rejects an incorrect password', async () => {
      const response = await request(app.getHttpServer()).post('/api/auth/sign-in/email').send({
        email: credentials.email,
        password: 'the-wrong-password',
      });

      expect(response.status).toBe(401);
    });

    it('rejects an unknown email', async () => {
      const response = await request(app.getHttpServer()).post('/api/auth/sign-in/email').send({
        email: 'no-such-user@example.com',
        password: 'password1234',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/sign-out (logout)', () => {
    it('ends the session so /api/users/me becomes unauthorized', async () => {
      const agent = request.agent(app.getHttpServer());
      await agent.post('/api/auth/sign-up/email').send({
        email: 'logout-user@example.com',
        password: 'password1234',
        name: 'Logout User',
      });

      const signOutResponse = await agent.post('/api/auth/sign-out');

      expect(signOutResponse.status).toBe(200);

      const me = await agent.get('/api/users/me');

      expect(me.status).toBe(401);
    });
  });
});
