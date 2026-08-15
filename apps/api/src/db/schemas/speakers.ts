import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const speakers = pgTable('speakers', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  title: text().notNull(),
  bio: text().notNull(),
  image: text().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});
