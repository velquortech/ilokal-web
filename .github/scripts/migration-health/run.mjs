/* global console, process, fetch, AbortSignal */
// Daily migration health check — the I/O around health.mjs.
//
//   node .github/scripts/migration-health/run.mjs
//
// Env: SUPABASE_ACCESS_TOKEN, PROJECT_REF (production), GH_TOKEN,
// GITHUB_REPOSITORY (owner/repo), ASSIGNEE (optional), DRY_RUN=1 to print the
// issue actions instead of taking them.
//
// Two checks, one issue each, in the same family as the deploy-failure
// workflow (#98): label `deploy-failure`, a hidden per-check marker. A problem
// opens the issue (or comments when it CHANGED — not every day); recovery
// closes it; "couldn't tell" (Supabase unreachable) leaves it alone. Exits 1
// when a problem is open, so the scheduled run is red too — GitHub emails the
// workflow's owner about that independently of the issue.

import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

import { classifyToken, decide, findBacklog, stateOf } from './health.mjs';

const API = process.env.SUPABASE_API_URL ?? 'https://api.supabase.com/v1';
const LABEL = 'deploy-failure';
const DRY = process.env.DRY_RUN === '1';
const REPO = process.env.GITHUB_REPOSITORY;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? '';
const REF = process.env.PROJECT_REF ?? '';
const RUN_URL = process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL}/${REPO}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : '(local run)';

const KEYS = {
  token: 'Health: Supabase access token',
  backlog: 'Health: migrations missing from production',
};
const marker = (key) => `<!-- deploy-failure-job: ${key} -->`;
const stateMarker = (state) => `<!-- health-state: ${state} -->`;

async function supabase(path, init = {}) {
  try {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(60_000),
    });
    return { status: res.status, body: res.ok ? await res.json() : null };
  } catch {
    return { status: 0, body: null };
  }
}

/** main's migrations, each with when it was added to the branch. */
function localMigrations() {
  const added = new Map();
  const log = execFileSync(
    'git',
    [
      'log',
      '--diff-filter=A',
      '--name-only',
      '--format=@%ct',
      '--',
      'supabase/migrations',
    ],
    { encoding: 'utf8' },
  );
  let at = 0;
  for (const line of log.split('\n')) {
    if (line.startsWith('@')) at = Number(line.slice(1)) * 1000;
    else if (line.endsWith('.sql')) {
      const version = line.split('/').pop().split('_')[0];
      if (!added.has(version)) added.set(version, at); // newest-first: keep the latest add
    }
  }
  return readdirSync('supabase/migrations')
    .filter((f) => f.endsWith('.sql'))
    .map((f) => {
      const version = f.split('_')[0];
      return { version, addedAt: added.get(version) ?? 0 };
    });
}

function gh(args) {
  if (DRY) {
    console.log(
      '[dry-run] gh',
      args.map((a) => (a.length > 60 ? `${a.slice(0, 60)}…` : a)).join(' '),
    );
    return '';
  }
  return execFileSync('gh', args, { encoding: 'utf8' });
}

function openIssue(key) {
  const list = JSON.parse(
    execFileSync(
      'gh',
      [
        'issue',
        'list',
        '--repo',
        REPO,
        '--label',
        LABEL,
        '--state',
        'open',
        '--limit',
        '100',
        '--json',
        'number,body,comments',
      ],
      { encoding: 'utf8' },
    ),
  );
  const issue = list.find((i) => i.body.includes(marker(key)));
  if (!issue) return null;
  const texts = [issue.body, ...issue.comments.map((c) => c.body)];
  const last = texts
    .reverse()
    .map((t) => t.match(/<!-- health-state: (\w+) -->/))
    .find(Boolean);
  return { number: issue.number, state: last?.[1] ?? null };
}

function report(key, verdict, { title, body, state }) {
  const existing = openIssue(key);
  if (verdict === 'healthy') {
    if (existing) {
      console.log(`${key}: healthy — closing #${existing.number}`);
      gh([
        'issue',
        'close',
        String(existing.number),
        '--repo',
        REPO,
        '--comment',
        `✅ Healthy again as of ${RUN_URL}.`,
      ]);
    } else console.log(`${key}: healthy`);
    return;
  }
  if (verdict !== 'problem') {
    console.log(`${key}: unknown this run — leaving any issue as it is`);
    return;
  }
  const text = `${body}\n\nCheck: ${RUN_URL}\n${stateMarker(state)}`;
  if (existing?.state === state) {
    console.log(
      `${key}: still failing, unchanged — #${existing.number} already says so`,
    );
  } else if (existing) {
    console.log(
      `${key}: still failing, changed — commenting on #${existing.number}`,
    );
    gh([
      'issue',
      'comment',
      String(existing.number),
      '--repo',
      REPO,
      '--body',
      `The problem changed.\n\n${text}`,
    ]);
  } else {
    console.log(`${key}: failing — opening an issue`);
    gh([
      'label',
      'create',
      LABEL,
      '--repo',
      REPO,
      '--color',
      'D93F0B',
      '--description',
      'A deploy job on main is failing',
      '--force',
    ]);
    const full = `${marker(key)}\n${text}\n\n<sub>Opened by the daily migration health check. Closed automatically once it passes.</sub>`;
    const args = [
      'issue',
      'create',
      '--repo',
      REPO,
      '--title',
      title,
      '--label',
      LABEL,
      '--body',
      full,
    ];
    try {
      gh(
        process.env.ASSIGNEE
          ? [...args, '--assignee', process.env.ASSIGNEE]
          : args,
      );
    } catch {
      gh(args); // e.g. the assignee can't be assigned: open it unassigned
    }
  }
}

const tokenStatus = await supabase(`/projects/${REF}`);
const token = TOKEN && REF ? classifyToken(tokenStatus.status) : 'invalid';

let backlog = null;
if (token === 'ok') {
  const ledger = await supabase(`/projects/${REF}/database/query`, {
    method: 'POST',
    body: JSON.stringify({
      query: 'select version from supabase_migrations.schema_migrations',
    }),
  });
  if (Array.isArray(ledger.body)) {
    backlog = findBacklog(
      localMigrations(),
      ledger.body.map((r) => String(r.version)),
      Date.now(),
    );
  }
}

const verdict = decide({ token, backlog });
console.log(
  JSON.stringify({ token, tokenHttp: tokenStatus.status, backlog, verdict }),
);

report(KEYS.token, verdict.token, {
  title: '🔴 Supabase access token rejected — migrations cannot deploy',
  state: stateOf({ token, http: tokenStatus.status }),
  body: [
    `The Supabase Management API rejects \`SUPABASE_ACCESS_TOKEN\` (HTTP ${tokenStatus.status || 'none'}${!TOKEN || !REF ? '; the token or project ref secret is not set' : ''}).`,
    'Until it is replaced, **every migration merged to `main` stays off production**, the deploy fails at `supabase link`, and the schema gate cannot read production.',
    '',
    '**Fix:**',
    '1. Create a token at https://supabase.com/dashboard/account/tokens (the account that owns the project). Note its expiry date if it has one.',
    '2. `gh secret set SUPABASE_ACCESS_TOKEN` — it prompts; never paste the value anywhere else.',
    '3. Re-run the latest failed **Deploy Supabase Migrations** run on `main`; it applies everything pending.',
  ].join('\n'),
});

if (backlog) {
  report(KEYS.backlog, verdict.backlog, {
    title: `🔴 ${backlog.pending.length} migration(s) on main are missing from production`,
    state: stateOf({ pending: backlog.pending, cloudOnly: backlog.cloudOnly }),
    body: [
      "Merged to `main` more than 2 hours ago and **not in production's migration ledger**:",
      '',
      ...backlog.pending.map((v) => `- \`${v}\``),
      '',
      'Code that needs them may already be live without its schema. Re-run the latest failed **Deploy Supabase Migrations** run on `main` once its cause is fixed (it applies every pending migration), then `supabase/reports/cloud_drift_probe.sql` confirms the objects.',
      ...(backlog.cloudOnly.length
        ? [
            '',
            `Also on production but **not** on \`main\` (drift): ${backlog.cloudOnly.map((v) => `\`${v}\``).join(', ')}.`,
          ]
        : []),
    ].join('\n'),
  });
}

if (verdict.token === 'problem' || verdict.backlog === 'problem')
  process.exitCode = 1;
