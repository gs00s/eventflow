import { inject } from 'vitest';

process.env.DATABASE_URL = inject('databaseUrl');
process.env.BETTER_AUTH_SECRET = 'test-secret-for-integration-tests-only';
