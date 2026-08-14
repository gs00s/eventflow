import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from '../env';
import * as schema from './schemas';

@Injectable()
export class DbService implements OnModuleDestroy {
  readonly db = drizzle(env.DATABASE_URL, { schema });

  onModuleDestroy() {
    return this.db.$client.end();
  }
}
