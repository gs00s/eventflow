import { inject } from 'vitest';
import failOnConsole from 'vitest-fail-on-console';

process.env.DATABASE_URL = inject('databaseUrl');
process.env.BETTER_AUTH_SECRET = 'test-secret-for-integration-tests-only';
// Better Auth warns internally on expected rejection paths (bad password, unknown email, etc).
failOnConsole({ shouldFailOnWarn: false });
