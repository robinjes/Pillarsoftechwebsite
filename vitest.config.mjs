import { defineConfig } from 'vitest/config';
import { transformWithOxc } from 'vite';

export default defineConfig({
  plugins: [{
    name: 'transform-setup-mts',
    enforce: 'pre',
    async transform(code, id) {
      if (!id.endsWith('.mts')) return undefined;
      return transformWithOxc(code, id, { target: 'es2020', jsx: 'preserve' });
    },
  }],
  oxc: {
    jsx: 'automatic',
    exclude: /\.mts$/,
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
