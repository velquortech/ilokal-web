import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    // `.claude/worktrees` holds live git worktrees of this same repo, so their
    // test files match `include` and get collected twice. Worse, `@/*` below
    // resolves against THIS project root, so a worktree file importing a helper
    // that exists only on its own branch fails to resolve and the run goes red
    // for a reason that has nothing to do with the code under test.
    exclude: ['node_modules', 'dist', '.next', '**/.claude/worktrees/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
