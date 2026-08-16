import { inject } from 'vitest';
import failOnConsole from 'vitest-fail-on-console';

process.env.DATABASE_URL = inject('databaseUrl');
process.env.BETTER_AUTH_SECRET = 'test-secret-for-integration-tests-only';
failOnConsole();
