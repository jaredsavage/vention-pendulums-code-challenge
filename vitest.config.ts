import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'tests/**/*.test.ts',
      'apps/*/tests/**/*.test.ts',
      'packages/*/tests/**/*.test.ts',
    ],
    testTimeout: 20000,
    // Keeps test machines apart from a running stack: no supervisor to join, and
    // ports it won't reach.
    env: {
      SUPERVISOR_URL: 'http://127.0.0.1:4599',
      MACHINE_PORT_START: '4700',
    },
  },
});
