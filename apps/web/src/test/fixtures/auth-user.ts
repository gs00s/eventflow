import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  isVip: boolean;
  createdAt: string;
  updatedAt: string;
}

export const userFactory = Factory.define<AuthUser>(({ sequence }) => ({
  id: `user-${sequence}`,
  name: 'Jane Doe',
  email: `jane.doe.${sequence}@example.com`,
  emailVerified: false,
  image: null,
  isVip: false,
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
}));

export function sessionFor(user: AuthUser) {
  return {
    session: {
      id: `session-${user.id}`,
      userId: user.id,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    },
    user,
  };
}
