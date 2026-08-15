import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { events } from '../db/schemas';

@Injectable()
export class EventsRepository {
  constructor(private readonly dbService: DbService) {}

  findAll() {
    return this.dbService.db.select().from(events);
  }

  findPublic() {
    return this.dbService.db.select().from(events).where(eq(events.isVip, false));
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
}
