import { relations } from 'drizzle-orm';
import { eventSessions } from './event-sessions';
import { events } from './events';
import { layouts } from './layouts';
import { speakers } from './speakers';

export const eventRelations = relations(events, ({ many, one }) => ({
  sessions: many(eventSessions),
  layout: one(layouts, {
    fields: [events.layoutId],
    references: [layouts.id],
  }),
}));

export const eventSessionRelations = relations(eventSessions, ({ one }) => ({
  event: one(events, {
    fields: [eventSessions.eventId],
    references: [events.id],
  }),
  speaker: one(speakers, {
    fields: [eventSessions.speakerId],
    references: [speakers.id],
  }),
}));

export const speakerRelations = relations(speakers, ({ many }) => ({
  sessions: many(eventSessions),
}));
