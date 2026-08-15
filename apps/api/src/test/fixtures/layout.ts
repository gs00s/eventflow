import { faker } from '@faker-js/faker';
import type { Layout } from '@eventflow/shared-types';
import { Factory } from 'fishery';

export interface LayoutRow {
  id: string;
  components: Layout['components'];
  createdAt: Date;
  updatedAt: Date;
}

export const layoutFactory = Factory.define<LayoutRow>(() => ({
  id: faker.string.uuid(),
  components: [
    {
      id: faker.string.uuid(),
      type: 'Heading',
      data: { text: 'About the Summit', level: 'h2' },
      components: [],
    },
    {
      id: faker.string.uuid(),
      type: 'Paragraph',
      data: { text: 'Join us for a day of cloud innovation.' },
      components: [],
    },
  ],
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
}));
