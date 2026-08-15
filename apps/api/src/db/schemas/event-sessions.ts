import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { events } from './events';
import { speakers } from './speakers';

export const eventSessions = pgTable(
  'sessions',
  {
    id: uuid().primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    speakerId: uuid('speaker_id')
      .notNull()
      .references(() => speakers.id),
    title: text().notNull(),
    from: timestamp().notNull(),
    to: timestamp().notNull(),
    description: text().notNull(),
    level: text().notNull(),
    track: text().notNull(),
    room: text().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('sessions_event_id_idx').on(table.eventId),
    index('sessions_speaker_id_idx').on(table.speakerId),
  ],
);
