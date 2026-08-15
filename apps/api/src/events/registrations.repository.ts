import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { registrations } from '../db/schemas';

@Injectable()
export class RegistrationsRepository {
  constructor(private readonly dbService: DbService) {}

  async create(userId: string, eventId: string) {
    const created = await this.dbService.db
      .insert(registrations)
      .values({ userId, eventId })
      .onConflictDoNothing()
      .returning({ id: registrations.id });

    return created.length > 0;
  }

  async existsForUser(userId: string, eventId: string) {
    const rows = await this.dbService.db
      .select({ id: registrations.id })
      .from(registrations)
      .where(and(eq(registrations.userId, userId), eq(registrations.eventId, eventId)))
      .limit(1);

    return rows.length > 0;
  }

  async delete(userId: string, eventId: string) {
    const deleted = await this.dbService.db
      .delete(registrations)
      .where(and(eq(registrations.userId, userId), eq(registrations.eventId, eventId)))
      .returning({ id: registrations.id });

    return deleted.length > 0;
  }
}
