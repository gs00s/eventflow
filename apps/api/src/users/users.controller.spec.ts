import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { sessionFor } from '../test/fixtures';
import { UsersController } from './users.controller';
import { UsersModule } from './users.module';

describe('UsersController', () => {
  it('resolves via Nest DI and returns the current user', async () => {
    const session = sessionFor();
    const module = await Test.createTestingModule({ imports: [UsersModule] }).compile();
    const controller = module.get(UsersController);

    const result = controller.getMe(session);

    expect(result).toEqual(session.user);
  });
});
