import { pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const speakers = pgTable('speakers', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  title: text().notNull(),
  bio: text().notNull(),
  image: text().notNull(),
});
