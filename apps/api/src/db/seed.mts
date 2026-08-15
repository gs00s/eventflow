import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { speakerSchema } from '@eventflow/shared-types';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as z from 'zod';
import { env } from '../env.ts';
import { eventSessions } from './schemas/event-sessions.ts';
import { events } from './schemas/events.ts';
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
});

async function seed() {
  const speakersRaw = JSON.parse(
    readFileSync(resolve(__dirname, './seeds/speakers.mock.json'), 'utf8'),
  );
  const speakersData = speakerSchema.array().parse(speakersRaw);

  const eventRaw = JSON.parse(readFileSync(resolve(__dirname, './seeds/event.mock.json'), 'utf8'));
  const eventData = eventMockSchema.parse(eventRaw);

  const db = drizzle(env.DATABASE_URL);

  await db.insert(speakers).values(speakersData).onConflictDoNothing();

  await db
    .insert(events)
    .values({
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
    })
    .onConflictDoNothing();

  await db
    .insert(eventSessions)
    .values(
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
    )
    .onConflictDoNothing();

  await db.$client.end();

  console.log(
    `Seeded ${speakersData.length} speaker(s), 1 event, ${eventData.sessions.length} session(s).`,
  );
}

void seed();
