import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { layoutSchema, speakerSchema, type LayoutComponent } from '@eventflow/shared-types';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as z from 'zod';
import { auth } from '../auth/auth.ts';
import { db as sharedDb } from './connection.ts';
import { env } from '../env.ts';
import { account } from './schemas/account.ts';
import { eventSessions } from './schemas/event-sessions.ts';
import { events } from './schemas/events.ts';
import { layouts } from './schemas/layouts.ts';
import { registrations } from './schemas/registrations.ts';
import { session } from './schemas/session.ts';
import { speakers } from './schemas/speakers.ts';
import { user } from './schemas/user.ts';
import { verification } from './schemas/verification.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

const VIP_USER_EMAIL = 'vip@example.com';
const DEMO_USER_EMAIL = 'demo@example.com';

const eventMockSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  description: z.string(),
  isVIP: z.boolean(),
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

  const speakerIds = new Set(speakersData.map((speaker) => speaker.id));
  const unknownSpeakerCardId = findSpeakerCardIds(layoutData.components).find(
    (id) => !speakerIds.has(id),
  );
  if (unknownSpeakerCardId) {
    throw new Error(
      `Seed data mismatch: SpeakerCard references speaker id ${unknownSpeakerCardId}, absent from speakers.mock.json.`,
    );
  }

  const db = drizzle(env.DATABASE_URL);

  // Full reset so every run lands on an identical clean state, not an accumulation of prior runs.
  await db.execute(
    sql`truncate table ${speakers}, ${layouts}, ${events}, ${eventSessions}, ${registrations}, ${user}, ${session}, ${account}, ${verification} restart identity cascade`,
  );

  await db.insert(speakers).values(speakersData);

  await db.insert(layouts).values({ id: layoutData.id, components: layoutData.components });

  await db.insert(events).values(
    eventsData.map((eventData) => ({
      id: eventData.id,
      title: eventData.title,
      subtitle: eventData.subtitle,
      description: eventData.description,
      isVip: eventData.isVIP,
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
  );

  await db.insert(eventSessions).values(
    eventsData.flatMap((eventData) =>
      eventData.sessions.map((eventSession) => ({
        id: eventSession.id,
        eventId: eventData.id,
        speakerId: eventSession.speakerId,
        title: eventSession.title,
        from: new Date(eventSession.from),
        to: new Date(eventSession.to),
        description: eventSession.description,
        level: eventSession.level,
        track: eventSession.track,
        room: eventSession.room,
      })),
    ),
  );

  await createUser(DEMO_USER_EMAIL, 'Demo Member');

  // isVip isn't a sign-up input (ADR 0002/0003) — flipped directly after creation.
  await createUser(VIP_USER_EMAIL, 'VIP Member');
  await db.update(user).set({ isVip: true }).where(eq(user.email, VIP_USER_EMAIL));

  await db.$client.end();
  await sharedDb.$client.end();

  const sessionCount = eventsData.reduce((total, event) => total + event.sessions.length, 0);
  console.log(
    `Seeded ${speakersData.length} speaker(s), ${eventsData.length} event(s), ${sessionCount} session(s), 1 layout, ` +
      `1 demo user (${DEMO_USER_EMAIL} / password1234), 1 VIP user (${VIP_USER_EMAIL} / password1234).`,
  );
}

function findSpeakerCardIds(components: LayoutComponent[]): string[] {
  return components.flatMap((component) => {
    if (component.type === 'Section') return findSpeakerCardIds(component.components);
    if (component.type === 'SpeakerList') return component.components.map((card) => card.data.id);
    return [];
  });
}

async function createUser(email: string, name: string) {
  await auth.api.signUpEmail({ body: { email, password: 'password1234', name } });
}

void seed();
