import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { speakers } from '../db/schemas';

@Injectable()
export class SpeakersRepository {
  constructor(private readonly dbService: DbService) {}

  findAll() {
    return this.dbService.db.select().from(speakers);
  }
}
