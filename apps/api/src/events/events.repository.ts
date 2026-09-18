import { Injectable } from '@nestjs/common';
import { and, eq, ilike, or } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { events } from '../db/schemas';

type EventRow = typeof events.$inferSelect;

export interface EventFields {
  title: string;
  subtitle: string;
  description: string;
  date: string;
  locationCity: string;
  locationVenue: string;
  locationAddress: string;
  organizerName: string;
  organizerImage: string;
  heroImage: string;
  heroCta: string;
  isVip: boolean;
}

@Injectable()
export class EventsRepository {
  constructor(private readonly dbService: DbService) {}

  findAll(q?: string) {
    return this.dbService.db
      .select()
      .from(events)
      .where(q ? matchesQuery(q) : undefined);
  }

  findPublic(q?: string) {
    return this.dbService.db
      .select()
      .from(events)
      .where(q ? and(eq(events.isVip, false), matchesQuery(q)) : eq(events.isVip, false));
  }

  findByOwner(ownerId: string) {
    return this.dbService.db.select().from(events).where(eq(events.ownerId, ownerId));
  }

  findById(id: string) {
    return this.dbService.db.query.events.findFirst({
      where: eq(events.id, id),
      with: {
        sessions: {
          with: { speaker: true },
        },
        layout: true,
      },
    });
  }

  async findRawById(id: string): Promise<EventRow | undefined> {
    const rows = await this.dbService.db.select().from(events).where(eq(events.id, id)).limit(1);

    return rows[0];
  }

  async findVipFlag(id: string): Promise<boolean | undefined> {
    const rows = await this.dbService.db
      .select({ isVip: events.isVip })
      .from(events)
      .where(eq(events.id, id))
      .limit(1);

    return rows[0]?.isVip;
  }

  async findOwnerId(id: string): Promise<string | undefined> {
    const rows = await this.dbService.db
      .select({ ownerId: events.ownerId })
      .from(events)
      .where(eq(events.id, id))
      .limit(1);

    return rows[0]?.ownerId;
  }

  async create(ownerId: string, values: EventFields): Promise<EventRow> {
    const [row] = await this.dbService.db
      .insert(events)
      .values({ ownerId, ...values })
      .returning();

    return row;
  }

  async update(id: string, ownerId: string, values: EventFields): Promise<EventRow | undefined> {
    const [row] = await this.dbService.db
      .update(events)
      .set(values)
      .where(and(eq(events.id, id), eq(events.ownerId, ownerId)))
      .returning();

    return row;
  }

  async delete(id: string, ownerId: string): Promise<boolean> {
    const deleted = await this.dbService.db
      .delete(events)
      .where(and(eq(events.id, id), eq(events.ownerId, ownerId)))
      .returning({ id: events.id });

    return deleted.length > 0;
  }
}

function matchesQuery(q: string) {
  return or(ilike(events.title, `%${q}%`), ilike(events.description, `%${q}%`));
}
