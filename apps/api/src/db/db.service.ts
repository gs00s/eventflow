import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { db } from './connection';

@Injectable()
export class DbService implements OnModuleDestroy {
  readonly db = db;

  onModuleDestroy() {
    return this.db.$client.end();
  }
}
