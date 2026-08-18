#!/usr/bin/env node
// Fails when real user PII is present in the repo — either as a file whose
// name matches a known export pattern (e.g. data/user-emails.csv) or as
// personal-email content inside any tracked file. Guards the pre-push hook
// and CI so a data export can never silently land again (see the 2026-08
// scrub of real production emails from history).
'use strict';

const { execFileSync } = require('child_process');
const { readFileSync, readdirSync, statSync } = require('fs');
const { join, relative, sep } = require('path');

const root = join(__dirname, '..', '..');

// Directories that are never user content and are expensive/noisy to scan.
// Mirrors the walk exclusions in the other WORKFLOW/tools checks.
const SKIP_DIRS = new Set([
  '.git',
  '.next',
  '.freebuff',
  '.claude',
  'node_modules',
  'out',
  'build',
  'coverage',
  '.yarn',
]);

// Filename patterns that indicate a user-data export. Anchored to basenames
// so normal files (e.g. user-emails.ts helpers) are not flagged — only
// actual dumps.
const PII_FILE_PATTERNS = [
  /^user-emails/,
  /^user-emails-.*\.(csv|txt|jsonl?|xlsx?)$/,
  /^emails-.*\.(csv|txt|jsonl?|xlsx?)$/,
  /^users-.*\.(csv|txt|jsonl?|xlsx?)$/,
  /^contacts-.*\.(csv|txt|jsonl?|xlsx?)$/,
  /^profiles-.*\.(csv|txt|jsonl?|xlsx?)$/,
];

// Environment files that must never be committed — they carry live secrets
// (Supabase service-role keys, DB URLs, tokens). `.env.example` is excluded:
// it is the intentionally-committed template, and so are `.env.example.*`
// variants. Enforced via STAGED filenames (pre-commit/pre-push) and TRACKED
// files (CI) — never via the working-tree walk, which skips dotfiles so the
// untracked `.env*` files on a dev machine never fail local hooks.
const ENV_FILE_RE = /^\.env(?!\.example($|\.))(\.|$)/;

// Real personal-email hosts. The app's own domains (ilokal.ph, ilokal.dev,
// showcase.ilokal.dev, example.com, shop.ph) are deliberately NOT here — those
// are product/test addresses, not user PII.
// Single line by convention: the contract test pins this exact regex.
const PERSONAL_HOST_RE =
  /[a-zA-Z0-9._%+-]+@(gmail|yahoo|outlook|hotmail|icloud|aol|protonmail|yandex|live)\.(com|co|ph|net|org)/i;

// File extensions worth content-scanning. Binary/generated files are skipped.
const SCAN_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.json',
  '.jsonl',
  '.md',
  '.mdx',
  '.txt',
  '.csv',
  '.sql',
  '.yml',
  '.yaml',
  '.toml',
  '.html',
  '.css',
  '.scss',
  '.env',
  '.example',
  '.sh',
  '.graphql',
]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function stagedFileNames() {
  try {
    const out = execFileSync('git', ['diff', '--cached', '--name-only', '-z'], {
      cwd: root,
      encoding: 'utf8',
    });
    return out.split('\0').filter(Boolean);
  } catch {
    return [];
  }
}

function trackedFileNames() {
  try {
    const out = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' });
    return out.split('\0').filter(Boolean);
  } catch {
    return [];
  }
}

const problems = [];
const seen = new Set();
const report = (path) => {
  const rel = relative(root, path).split(sep).join('/');
  if (!seen.has(rel)) {
    seen.add(rel);
    problems.push(rel);
  }
};

// 1) Staged file names — the "is ever staged" guarantee, even before commit.
for (const name of stagedFileNames()) {
  const base = name.split('/').pop() || '';
  if (PII_FILE_PATTERNS.some((re) => re.test(base))) {
    console.error(`[check:pii] Staged PII export filename: ${name}`);
    problems.push(`staged:${name}`);
  } else if (ENV_FILE_RE.test(base)) {
    console.error(`[check:pii] Staged environment file (likely secrets): ${name}`);
    problems.push(`staged:${name}`);
  }
}

// 1b) Tracked dotfiles — a committed `.env` must fail CI even though the
//     working-tree walk skips dotfiles. `git ls-files` only sees tracked
//     files, so untracked on-disk `.env*` stay invisible to this check.
for (const name of trackedFileNames()) {
  const base = name.split('/').pop() || '';
  if (ENV_FILE_RE.test(base)) {
    console.error(`[check:pii] Tracked environment file (likely secrets): ${name}`);
    problems.push(`tracked:${name}`);
  }
}

// 2) Working tree — filenames + personal-email content. This is the CI
//    guarantee: a committed export is present in the tree and fails the build.
for (const file of walk(root)) {
  const rel = relative(root, file).split(sep).join('/');
  const base = file.split(sep).pop() || '';

  if (PII_FILE_PATTERNS.some((re) => re.test(base))) {
    console.error(`[check:pii] PII export filename in tree: ${rel}`);
    report(file);
    continue; // no need to also scan its content
  }

  const ext = base.includes('.') ? base.slice(base.lastIndexOf('.')) : '';
  if (!SCAN_EXTENSIONS.has(ext)) continue;
  if (statSync(file).size > 2 * 1024 * 1024) continue; // skip huge files

  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue; // unreadable/binary — treat as not-PII
  }
  if (content.includes('\u0000')) continue; // binary
  if (PERSONAL_HOST_RE.test(content)) {
    console.error(`[check:pii] Personal email content: ${rel}`);
    report(file);
  }
}

if (problems.length > 0) {
  console.error(
    `[check:pii] ${problems.length} file(s) look like real user PII. ` +
      'Nothing matching these patterns may be committed to this public repo.',
  );
  process.exit(1);
} else {
  console.info(
    '[check:pii] No PII export files or personal-email content found.',
  );
}
