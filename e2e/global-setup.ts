import type { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Refuse-to-run guard. THE reason this suite is safe to keep in the repo.
 *
 * The specs write real rows through the real app. Every other safety layer
 * (filenames, gitignore, staying out of CI) protects the repo; this one
 * protects production data. It mirrors the inverted idiom `make seed-cloud`
 * already uses:
 *
 *     case "$$NEXT_PUBLIC_SUPABASE_URL" in
 *       *127.0.0.1*|*localhost*) echo "Refusing: ... looks local." >&2; exit 1;;
 *
 * ...except here the polarity is flipped: anything that is NOT local is fatal.
 */

const LOCAL_HOST = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

function isLocal(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    return LOCAL_HOST.test(`${u.protocol}//${u.host}`);
  } catch {
    return false;
  }
}

/**
 * Read a key out of `.env` without adding a dotenv dependency (the stack is
 * frozen). Returns the process env first so an explicit override still wins.
 */
function readEnvKey(key: string): string | undefined {
  if (process.env[key]) return process.env[key];

  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return undefined;

  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    if (trimmed.slice(0, eq).trim() !== key) continue;
    return trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
  }
  return undefined;
}

function refuse(reason: string, detail: string): never {
  console.error(
    [
      '',
      '  ╔══════════════════════════════════════════════════════════════╗',
      '  ║  E2E REFUSED TO RUN                                          ║',
      '  ╚══════════════════════════════════════════════════════════════╝',
      '',
      `  ${reason}`,
      `  ${detail}`,
      '',
      '  This suite writes real rows (branches, coupons, redemptions,',
      '  follows, events) through the real app. It is local-only by design.',
      '',
      '  Start the local stack with `make run-dev`, then re-run.',
      '',
    ].join('\n'),
  );
  process.exit(1);
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL;
  if (typeof baseURL !== 'string' || !baseURL) {
    refuse('No baseURL configured.', 'Expected http://localhost:3000');
  }
  if (!isLocal(baseURL)) {
    refuse('baseURL is not local.', `Got: ${baseURL}`);
  }

  const supabaseUrl = readEnvKey('NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseUrl) {
    refuse(
      'NEXT_PUBLIC_SUPABASE_URL is not set.',
      'Cannot prove the target is local, so refusing rather than guessing.',
    );
  }
  if (!isLocal(supabaseUrl)) {
    refuse(
      'NEXT_PUBLIC_SUPABASE_URL points at a REMOTE project.',
      `Got: ${supabaseUrl}`,
    );
  }

  // A service-role key in scope means a spec could bypass RLS. The suite is
  // meant to exercise the app exactly as a user does, so refuse the shortcut.
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    refuse(
      'SUPABASE_SERVICE_ROLE_KEY is exported into this process.',
      'The specs must drive the app as a real user, never bypass RLS. Unset it.',
    );
  }

  // eslint-disable-next-line no-console
  console.log(
    `\n  E2E target verified local:\n    app      ${baseURL}\n    supabase ${supabaseUrl}\n`,
  );
}
