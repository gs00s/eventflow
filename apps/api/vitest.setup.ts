import { config } from 'dotenv';
import failOnConsole from 'vitest-fail-on-console';

config({ path: '.env.test' });
failOnConsole();
