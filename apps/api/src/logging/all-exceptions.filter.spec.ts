import type { ArgumentsHost } from '@nestjs/common';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { describe, expect, it, vi } from 'vitest';
import { AllExceptionsFilter } from './all-exceptions.filter';

function mockHost(request: Record<string, unknown>) {
  const status = vi.fn().mockReturnThis();
  const json = vi.fn();
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ status, json }),
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

async function buildFilter() {
  const warn = vi.fn();
  const error = vi.fn();
  const module = await Test.createTestingModule({
    providers: [
      AllExceptionsFilter,
      { provide: PinoLogger, useValue: { setContext: vi.fn(), warn, error } },
    ],
  }).compile();

  return { filter: module.get(AllExceptionsFilter), warn, error };
}

describe('AllExceptionsFilter', () => {
  it('logs a 4xx HttpException at warn, without a stack trace', async () => {
    const { filter, warn, error } = await buildFilter();
    const { host, status } = mockHost({ method: 'GET', url: '/api/events/missing' });

    filter.catch(new NotFoundException(), host);

    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, method: 'GET', path: '/api/events/missing' }),
      'Not Found',
    );
    expect(error).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(404);
  });

  it('includes the user id when the request reached auth', async () => {
    const { filter, warn } = await buildFilter();
    const { host } = mockHost({
      method: 'POST',
      url: '/api/events/1/register',
      user: { id: 'user-1' },
    });

    filter.catch(new ForbiddenException(), host);

    expect(warn).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }), 'Forbidden');
  });

  it('logs an unhandled error at error, with the error attached for its stack trace', async () => {
    const { filter, error } = await buildFilter();
    const { host, status, json } = mockHost({ method: 'GET', url: '/api/events' });
    const thrown = new Error('database connection lost');

    filter.catch(thrown, host);

    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, err: thrown }),
      'Unhandled exception',
    );
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ statusCode: 500, message: 'Internal server error' });
  });
});
