import type { Layout } from '@eventflow/shared-types';
import { jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

export const layouts = pgTable('layouts', {
  id: uuid().primaryKey().defaultRandom(),
  components: jsonb().$type<Layout['components']>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
