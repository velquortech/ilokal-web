// Standardize and suppress noisy logs during tests.
// This file is loaded by Vitest via `setupFiles` in vitest.config.ts.

const originalConsoleError = console.error.bind(console);

// If VITEST is set (Vitest runtime), replace console.error with a concise formatter
if (process.env.VITEST || process.env.NODE_ENV === 'test') {
  console.error = (...args: unknown[]) => {
    try {
      const parts = args.map((a) => {
        if (a instanceof Error) return a.message;
        if (typeof a === 'object') {
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        }
        return String(a);
      });
      // Single-line standardized message to reduce noisy stack traces in test output
      originalConsoleError(`[TEST_ERROR] ${parts.join(' ')}\n`);
    } catch {
      // Fallback to original if something goes wrong
      originalConsoleError('[TEST_ERROR] (failed to format error)');
      originalConsoleError(...args);
    }
  };
}
