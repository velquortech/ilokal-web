import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    // `exclude` REPLACES vitest's defaults instead of extending them, so this
    // list is the whole guard — and the bare names it used to hold ('node_modules')
    // only ever matched the top-level directory. Two things leaked through:
    //
    //   1. `.claude/worktrees/*/node_modules` — published packages ship their own
    //      `.test.ts` sources (msw, among others), and one asks for
    //      `@vitest-environment jsdom`. This repo installs happy-dom, not jsdom,
    //      so collection aborts with "Cannot find package 'jsdom'" — an error
    //      naming a dependency we never had rather than the glob that found it.
    //   2. `.claude/worktrees/*` — live git worktrees of THIS repo, so their test
    //      files match `include` and get collected as if they were ours, while the
    //      `@/*` alias below still resolves against THIS root. A worktree file
    //      importing a helper that exists only on its own branch fails to resolve.
    //
    // A worktree's tests belong to its own branch and run from its own directory,
    // where it has its own node_modules and its own config.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.claude/worktrees/**',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
