import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  isVip: boolean;
}

export const userFactory = Factory.define<UserRow>(() => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  isVip: false,
}));
