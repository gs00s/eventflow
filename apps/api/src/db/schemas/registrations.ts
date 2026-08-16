import { pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { events } from './events';
import { user } from './user';

export const registrations = pgTable(
  'registrations',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    registeredAt: timestamp('registered_at').defaultNow().notNull(),
  },
  (table) => [unique('registrations_user_id_event_id_unique').on(table.userId, table.eventId)],
);
