import { boolean, date, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { layouts } from './layouts';
import { user } from './user';

export const events = pgTable('events', {
  id: uuid().primaryKey().defaultRandom(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: text().notNull(),
  subtitle: text().notNull(),
  description: text().notNull(),
  heroImage: text('hero_image').notNull(),
  heroCta: text('hero_cta').notNull(),
  date: date().notNull(),
  locationCity: text('location_city').notNull(),
  locationVenue: text('location_venue').notNull(),
  locationAddress: text('location_address').notNull(),
  organizerName: text('organizer_name').notNull(),
  organizerImage: text('organizer_image').notNull(),
  isVip: boolean('is_vip').default(false).notNull(),
  layoutId: uuid('layout_id').references(() => layouts.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
