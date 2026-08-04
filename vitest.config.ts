import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    // `e2e/` holds Playwright specs, which need a real browser and a running
    // Supabase stack. They are named `*.spec.ts` so `include` above already
    // misses them; this is the second net, so a file named `*.test.ts` in
    // there fails loudly at review rather than silently under `environment:
    // 'node'` in `yarn test:run`.
    exclude: ['node_modules', 'dist', '.next', 'e2e'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
