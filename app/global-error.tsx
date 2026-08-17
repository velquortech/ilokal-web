'use client';

/**
 * Root error boundary.
 *
 * `app/error.tsx` cannot catch an error thrown by the ROOT LAYOUT, or one
 * thrown by `error.tsx` itself — it renders inside the layout it would need to
 * replace. Those are exactly the failures worth hearing about, and until this
 * file existed they were both invisible and unreportable (SN3).
 *
 * It replaces the whole document, so it must render its own <html> and <body>
 * and cannot rely on the root layout's fonts, providers or theme. That is why
 * it is styled inline against the brand palette rather than with the token
 * classes the rest of the app uses — no stylesheet is guaranteed to have
 * loaded at this point.
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    // Same `dir="ltr"` as the root layout: this document replaces the root
    // layout's entirely, so it cannot inherit it — and on an RTL-configured
    // device an undirected <html> would flip this error page (and any text
    // it contains) right-to-left.
    <html lang="en" dir="ltr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          // Porcelain / Charcoal — the brand's own neutrals, inlined because no
          // stylesheet is guaranteed to have loaded.
          background: '#FBFAF6',
          color: '#1A1A1A',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        }}
      >
        <main style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '1.75rem',
              lineHeight: 1.2,
              margin: '0 0 0.75rem',
            }}
          >
            Something went wrong
          </h1>
          <p style={{ margin: '0 0 1.5rem', color: '#4A4A4A' }}>
            The page failed to load. This has been reported — trying again often
            works.
          </p>

          {error.digest && (
            <p
              style={{
                margin: '0 0 1.5rem',
                fontSize: '0.8125rem',
                color: '#6B6B6B',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            >
              Reference: {error.digest}
            </p>
          )}

          <button
            type="button"
            onClick={() => reset()}
            style={{
              // Brick Ember on Porcelain measures 5.17:1.
              background: '#D70005',
              color: '#FBFAF6',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
