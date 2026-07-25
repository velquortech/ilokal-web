/**
 * Detect a Next.js redirect "error".
 *
 * A successful server-action `redirect()` throws a control-flow error — the
 * reliable marker is `digest` starting with "NEXT_REDIRECT" (the message may
 * be empty across the client boundary, especially in production builds).
 * Digest first, message as a fallback.
 *
 * Client forms use this to let redirect rejections pass through as expected
 * navigation instead of rendering them as failures.
 */
export function isRedirectError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const digest = (error as { digest?: unknown }).digest;
  if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT'))
    return true;
  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' && message.includes('NEXT_REDIRECT');
}
