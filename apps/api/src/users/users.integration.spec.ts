import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { user } from '../db/schemas/user';
import { createTestApp } from '../test/app-harness';
import { clearTable } from '../test/db';

describe('Users (integration)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    await clearTable(user);
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers, logs in, exposes the current user, and logs out', async () => {
    const agent = request.agent(app.getHttpServer());
    const credentials = { email: 'jane@example.com', password: 'password1234' };

    const signUpResponse = await agent
      .post('/api/auth/sign-up/email')
      .send({ ...credentials, name: 'Jane Doe' });

    expect(signUpResponse.status).toBe(200);

    await agent.post('/api/auth/sign-out');

    const signInResponse = await agent.post('/api/auth/sign-in/email').send(credentials);

    expect(signInResponse.status).toBe(200);

    const meResponse = await agent.get('/api/users/me');

    expect(meResponse.status).toBe(200);
    expect(meResponse.body).toEqual({
      id: expect.any(String),
      email: credentials.email,
      name: 'Jane Doe',
    });

    await agent.post('/api/auth/sign-out');

    const meAfterSignOut = await agent.get('/api/users/me');

    expect(meAfterSignOut.status).toBe(401);
  });
});
