/**
 * check:pii contract.
 *
 * Real production user emails were committed to this public repo in 2026-08
 * and scrubbed from history. This suite pins the guard that makes a repeat
 * impossible: `WORKFLOW/tools/checkPiiFiles.js` must keep flagging PII export
 * filenames (data/user-emails*) and personal-email content, and the check
 * must stay wired into the pre-commit hook, the pre-push hook, AND the CI
 * Setup job — so a future edit that weakens the patterns or drops the wiring
 * fails CI instead of silently allowing another data dump through.
 *
 * What it pins:
 *   - the tool's filename patterns (user-emails* etc., plus `.env*` but NOT
 *     `.env.example`) and personal-host regex, at the source level
 *     (exact-string pins, so renames break CI);
 *   - the exit-1 on violation behavior (guarded by a run of the tool against
 *     a planted file, cleaned up after);
 *   - a staged/tracked `.env*` file exits 1 while a staged `.env.example`
 *     passes (guarded in a throwaway git repo, cleaned up after);
 *   - package.json: the `check:pii` script exists, the pre-commit script runs
 *     it (wired via the `.husky/pre-commit` hook), and pre-push runs it;
 *   - the CI workflow: the Setup job runs `yarn run check:pii`.
 *
 * NOTE: this test never contains a contiguous personal-email literal — the
 * planted values are built by concatenation so the guard's own content scan
 * does not flag its own test file.
 */

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  mkdtempSync,
  copyFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = join(__dirname, '../..');
const read = (relative: string) => readFileSync(join(ROOT, relative), 'utf8');

const tool = read('WORKFLOW/tools/checkPiiFiles.js');
const pkg = read('package.json');
const workflow = read('.github/workflows/pull-request-workflow.yml');
const preCommitHook = read('.husky/pre-commit');

// The planted addresses, split so no contiguous personal-email literal
// exists in THIS file.
const PLANTED_HOST = 'gmail.com';
const plantedCsvBody = 'email,role\nplanted@' + PLANTED_HOST + ',app_user\n';
const plantedContent = 'const c = "planted@' + PLANTED_HOST + '";\n';

describe('checkPiiFiles.js — the tool itself', () => {
  it('flags the known PII export filename patterns (user-emails* and friends)', () => {
    // Exact-string pins of the regex literals as written in the tool, so a
    // weakened/renamed pattern fails here instead of silently passing.
    for (const source of [
      '/^user-emails/',
      '/^user-emails-.*\\.(csv|txt|jsonl?|xlsx?)$/',
      '/^emails-.*\\.(csv|txt|jsonl?|xlsx?)$/',
      '/^users-.*\\.(csv|txt|jsonl?|xlsx?)$/',
      '/^contacts-.*\\.(csv|txt|jsonl?|xlsx?)$/',
      '/^profiles-.*\\.(csv|txt|jsonl?|xlsx?)$/',
    ]) {
      expect(tool).toContain(source);
    }
  });

  it('blocks staged/tracked .env files but never the .env.example template', () => {
    // exact-string pin of the env regex as written in the tool (dotfiles are
    // skipped by the tree walk, so this rule lives in the staged + tracked
    // filename checks instead — local untracked .env* never fail dev hooks)
    expect(tool).toContain('/^\\.env(?!\\.example($|\\.))(\\.|$)/');
    expect(tool).toContain('Staged environment file');
    expect(tool).toContain('Tracked environment file');
    expect(tool).toContain("git', ['ls-files'");
  });

  it('flags personal-email hosts but never the app/test domains', () => {
    // The regex declaration may be prettier-wrapped across lines, so search
    // the whole tool source rather than a single line. The tool source
    // escapes the dot as `\.`, so pin the exact literal text rather than a
    // regex that would need to model that escaping.
    expect(tool).toContain('PERSONAL_HOST_RE');
    expect(tool).toContain(
      '@(gmail|yahoo|outlook|hotmail|icloud|aol|protonmail|yandex|live)\\.(com|co|ph|net|org)',
    );
    // The personal-host regex itself must not sweep in the app's own domains
    // (the declaration and its regex are contiguous in the source).
    const decl = tool.slice(tool.indexOf('PERSONAL_HOST_RE'));
    const hostDecl = decl.slice(0, decl.indexOf(';') + 1);
    expect(hostDecl).toMatch(/PERSONAL_HOST_RE/);
    expect(hostDecl).not.toMatch(/ilokal/);
    expect(hostDecl).not.toMatch(/example\.com/);
  });

  it('walks the tree and skips heavy dirs', () => {
    expect(tool).toContain('SKIP_DIRS');
    for (const dir of ['node_modules', '.next', '.git', '.freebuff']) {
      expect(tool).toContain(dir);
    }
  });

  it('exits 1 when a PII file is planted, 0 when clean', () => {
    const toolPath = join(ROOT, 'WORKFLOW/tools/checkPiiFiles.js');
    const planted = join(ROOT, 'data', 'user-emails-guard-test.csv');
    const contentFile = join(ROOT, 'tmp-pii-guard-notes.md');
    mkdirSync(join(ROOT, 'data'), { recursive: true });

    try {
      // Clean baseline first.
      const clean = execFileSync('node', [toolPath], {
        cwd: ROOT,
        encoding: 'utf8',
      });
      expect(clean).toContain('No PII export files');

      // Plant a file matching the export filename pattern.
      writeFileSync(planted, plantedCsvBody);
      expect(() => execFileSync('node', [toolPath], { cwd: ROOT })).toThrow();

      // Content scan: an innocent filename with a personal email must fail.
      rmSync(planted, { force: true });
      writeFileSync(contentFile, plantedContent);
      expect(() => execFileSync('node', [toolPath], { cwd: ROOT })).toThrow();
    } finally {
      rmSync(planted, { force: true });
      rmSync(contentFile, { force: true });
    }

    // Cleanup and confirm the tree is green again.
    const after = execFileSync('node', [toolPath], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(after).toContain('No PII export files');
  });

  it('exits 1 for a staged/tracked .env.local but 0 for a staged .env.example', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'pii-env-guard-'));
    const toolPath = join(tmp, 'WORKFLOW/tools/checkPiiFiles.js');
    try {
      execFileSync('git', ['init', '-q'], { cwd: tmp });
      execFileSync('git', ['config', 'user.email', 'guard@test'], { cwd: tmp });
      execFileSync('git', ['config', 'user.name', 'guard'], { cwd: tmp });
      mkdirSync(join(tmp, 'WORKFLOW/tools'), { recursive: true });
      copyFileSync(join(ROOT, 'WORKFLOW/tools/checkPiiFiles.js'), toolPath);

      // The legit template must pass, staged or not.
      writeFileSync(join(tmp, '.env.example'), 'SUPABASE_URL=https://example.com\n');
      execFileSync('git', ['add', '.env.example'], { cwd: tmp });
      const clean = execFileSync('node', [toolPath], { cwd: tmp, encoding: 'utf8' });
      expect(clean).toContain('No PII export files');

      // A real env file force-staged (bypassing gitignore) must fail.
      writeFileSync(join(tmp, '.env.local'), 'SERVICE_ROLE_KEY=placeholder-secret-123\n');
      execFileSync('git', ['add', '-f', '.env.local'], { cwd: tmp });
      expect(() => execFileSync('node', [toolPath], { cwd: tmp })).toThrow();

      // And once committed to the index, the tracked-file check still fails it.
      execFileSync('git', ['commit', '-qm', 'plant'], { cwd: tmp });
      expect(() => execFileSync('node', [toolPath], { cwd: tmp })).toThrow();
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('wiring survives (the guard cannot be silently removed)', () => {
  it('package.json exposes check:pii, pre-push runs it, and pre-commit runs it', () => {
    expect(pkg).toContain(
      '"check:pii": "node WORKFLOW/tools/checkPiiFiles.js"',
    );
    expect(pkg).toContain(
      '"pre-push": "yarn lint && yarn check:protected && yarn check:imports && yarn check:pii',
    );
    expect(pkg).toContain('"pre-commit": "yarn check:pii"');
    // the thin husky hook must delegate to the script
    expect(preCommitHook).toContain('yarn pre-commit');
  });

  it('the CI Setup job runs yarn run check:pii', () => {
    expect(workflow).toContain('- run: yarn run check:pii');
  });

  it('the tool exits 1 (not 0) on violation — a pass that never ran would be vacuous', () => {
    expect(tool).toContain('process.exit(1)');
  });
});
