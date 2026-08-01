import { Geist_Mono, Inter } from 'next/font/google';
import localFont from 'next/font/local';

/**
 * iLokal type system (brand v1.0).
 *
 *   Primary / display  Pally   — headings, the wordmark, brand moments
 *   Secondary / body   Inter   — every other piece of UI text
 *   Mono               Geist Mono — code, ids, claim codes
 *
 * Pally is not on Google Fonts, so it is self-hosted (Fontshare, free personal
 * + commercial licence). Self-hosting via `next/font/local` rather than a CDN
 * <link> keeps the runtime free of third-party requests and lets Next emit the
 * preload + `size-adjust` fallback metrics, which is what keeps CLS at zero.
 *
 * The sources live in `assets/`, NOT `public/`. `next/font/local` only reads
 * them at build time and re-emits them hashed and immutable under
 * `/_next/static/media`; keeping the originals in `public/` shipped every face
 * a second time as a plain, un-cache-busted `/fonts/Pally-Bold.woff2` that
 * nothing ever requested.
 *
 * Pally ships Regular/Medium/Bold only — there is no 800. The wordmark is a
 * drawn asset (see `components/custom/BrandLogo.tsx`), not live text, so the
 * missing weight never shows.
 */

export const pally = localFont({
  src: [
    {
      path: '../assets/fonts/Pally-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../assets/fonts/Pally-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../assets/fonts/Pally-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  // Named after the face, not the slot: the slot name `--font-display` is the
  // Tailwind theme token, and pointing it at a variable of the same name would
  // be a self-reference (invalid at computed-value time on :root).
  variable: '--font-pally',
  display: 'swap',
  fallback: ['ui-rounded', 'Segoe UI', 'system-ui', 'sans-serif'],
});

export const inter = Inter({
  variable: '--font-sans-brand',
  subsets: ['latin'],
  display: 'swap',
});

export const geistMono = Geist_Mono({
  variable: '--font-mono-brand',
  subsets: ['latin'],
  display: 'swap',
});

export const fontVariables = `${pally.variable} ${inter.variable} ${geistMono.variable}`;
