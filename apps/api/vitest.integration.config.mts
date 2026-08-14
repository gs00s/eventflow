import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.integration.spec.ts'],
    globalSetup: ['./src/db/testcontainers-global-setup.ts'],
    setupFiles: ['./src/db/testcontainers-setup-file.ts'],
    hookTimeout: 60_000,
    testTimeout: 60_000,
    fileParallelism: false,
  },
  plugins: [
    swc.vite({
      jsc: {
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
    }),
  ],
});
