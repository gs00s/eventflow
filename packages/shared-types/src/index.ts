import * as z from 'zod';

export const speakerSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  bio: z.string(),
  image: z.string(),
});

export type Speaker = z.infer<typeof speakerSchema>;

export const currentUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
});

export type CurrentUser = z.infer<typeof currentUserSchema>;

export const eventLocationSchema = z.object({
  city: z.string(),
  venue: z.string(),
  address: z.string(),
});

export const eventHeroSchema = z.object({
  image: z.string(),
  cta: z.string(),
});

export const eventSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  date: z.string(),
  location: eventLocationSchema,
  hero: eventHeroSchema,
});

export type Event = z.infer<typeof eventSchema>;

export const eventSessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  from: z.string(),
  to: z.string(),
  description: z.string(),
  level: z.string(),
  track: z.string(),
  room: z.string(),
  speaker: speakerSchema,
});

export type EventSession = z.infer<typeof eventSessionSchema>;

export const eventDetailSchema = eventSchema.extend({
  description: z.string(),
  organizer: z.object({
    name: z.string(),
    image: z.string(),
  }),
  sessions: eventSessionSchema.array(),
  speakers: speakerSchema.array(),
});

export type EventDetail = z.infer<typeof eventDetailSchema>;

export const speakerEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
});

export type SpeakerEvent = z.infer<typeof speakerEventSchema>;

export const speakerDetailSchema = speakerSchema.extend({
  events: speakerEventSchema.array(),
});

export type SpeakerDetail = z.infer<typeof speakerDetailSchema>;
