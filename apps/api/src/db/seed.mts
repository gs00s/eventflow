import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { layoutSchema, speakerSchema } from '@eventflow/shared-types';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as z from 'zod';
import { env } from '../env.ts';
import { eventSessions } from './schemas/event-sessions.ts';
import { events } from './schemas/events.ts';
import { layouts } from './schemas/layouts.ts';
import { speakers } from './schemas/speakers.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

const eventMockSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  description: z.string(),
  hero: z.object({ image: z.string(), cta: z.string() }),
  date: z.string(),
  location: z.object({ city: z.string(), venue: z.string(), address: z.string() }),
  organizer: z.object({ name: z.string(), img: z.string() }),
  sessions: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      from: z.string(),
      to: z.string(),
      speakerId: z.string(),
      description: z.string(),
      level: z.string(),
      track: z.string(),
      room: z.string(),
    }),
  ),
  layoutId: z.string().nullable(),
});

async function seed() {
  const speakersRaw = JSON.parse(
    readFileSync(resolve(__dirname, './seeds/speakers.mock.json'), 'utf8'),
  );
  const speakersData = speakerSchema.array().parse(speakersRaw);

  const eventsRaw = JSON.parse(
    readFileSync(resolve(__dirname, './seeds/events.mock.json'), 'utf8'),
  );
  const eventsData = eventMockSchema.array().parse(eventsRaw);

  const layoutRaw = JSON.parse(
    readFileSync(resolve(__dirname, './seeds/layout.mock.json'), 'utf8'),
  );
  const layoutData = layoutSchema.parse(layoutRaw);

  if (!eventsData.some((event) => event.layoutId === layoutData.id)) {
    throw new Error(
      "Seed data mismatch: no event in events.mock.json references layout.mock.json's id.",
    );
  }

  const db = drizzle(env.DATABASE_URL);

  await db.insert(speakers).values(speakersData).onConflictDoNothing();

  await db
    .insert(layouts)
    .values({ id: layoutData.id, components: layoutData.components })
    .onConflictDoNothing();

  await db
    .insert(events)
    .values(
      eventsData.map((eventData) => ({
        id: eventData.id,
        title: eventData.title,
        subtitle: eventData.subtitle,
        description: eventData.description,
        heroImage: eventData.hero.image,
        heroCta: eventData.hero.cta,
        date: eventData.date,
        locationCity: eventData.location.city,
        locationVenue: eventData.location.venue,
        locationAddress: eventData.location.address,
        organizerName: eventData.organizer.name,
        organizerImage: eventData.organizer.img,
        layoutId: eventData.layoutId,
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(eventSessions)
    .values(
      eventsData.flatMap((eventData) =>
        eventData.sessions.map((session) => ({
          id: session.id,
          eventId: eventData.id,
          speakerId: session.speakerId,
          title: session.title,
          from: new Date(session.from),
          to: new Date(session.to),
          description: session.description,
          level: session.level,
          track: session.track,
          room: session.room,
        })),
      ),
    )
    .onConflictDoNothing();

  await db.$client.end();

  const sessionCount = eventsData.reduce((total, event) => total + event.sessions.length, 0);
  console.log(
    `Seeded ${speakersData.length} speaker(s), ${eventsData.length} event(s), ${sessionCount} session(s), 1 layout.`,
  );
}

void seed();
