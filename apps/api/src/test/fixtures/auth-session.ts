import { faker } from '@faker-js/faker';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import type { auth } from '../../auth/auth';

export function sessionFor(overrides?: Partial<{ id: string; email: string; name: string }>) {
  return {
    user: {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: 'Jane Doe',
      ...overrides,
    },
  } as UserSession<typeof auth>;
}
