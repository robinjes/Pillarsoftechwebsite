import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: {
    jsx: 'automatic',
  },
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
