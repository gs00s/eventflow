import { Injectable } from '@nestjs/common';
import { and, eq, ilike, or } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { events } from '../db/schemas';

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

  async findVipFlag(id: string): Promise<boolean | undefined> {
    const rows = await this.dbService.db
      .select({ isVip: events.isVip })
      .from(events)
      .where(eq(events.id, id))
      .limit(1);

    return rows[0]?.isVip;
  }
}

function matchesQuery(q: string) {
  return or(ilike(events.title, `%${q}%`), ilike(events.description, `%${q}%`));
}
