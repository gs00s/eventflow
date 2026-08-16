import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { eventSessions, events, speakers } from '../db/schemas';

@Injectable()
export class SpeakersRepository {
  constructor(private readonly dbService: DbService) {}

  findAll() {
    return this.dbService.db.select().from(speakers);
  }

  findById(id: string) {
    return this.dbService.db.query.speakers.findFirst({
      where: eq(speakers.id, id),
    });
  }

  async exists(id: string) {
    const rows = await this.dbService.db
      .select({ id: speakers.id })
      .from(speakers)
      .where(eq(speakers.id, id))
      .limit(1);

    return rows.length > 0;
  }

  findEvents(speakerId: string) {
    return this.dbService.db.query.eventSessions.findMany({
      where: eq(eventSessions.speakerId, speakerId),
      with: { event: true },
    });
  }

  findPublicEvents(speakerId: string) {
    return this.dbService.db
      .select({ event: events })
      .from(eventSessions)
      .innerJoin(events, eq(eventSessions.eventId, events.id))
      .where(and(eq(eventSessions.speakerId, speakerId), eq(events.isVip, false)));
  }
}
