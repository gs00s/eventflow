import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { sessionFor } from '../test/fixtures';
import { UsersModule } from './users.module';
import { UsersService } from './users.service';

describe('UsersService', () => {
  it('maps the session user to a current-user DTO', async () => {
    const session = sessionFor();
    const module = await Test.createTestingModule({ imports: [UsersModule] }).compile();
    const service = module.get(UsersService);

    const result = service.getCurrentUser(session);

    expect(result).toEqual(session.user);
  });
});
