/**
 * Error-log funnel contract.
 *
 * `PostgrestError` carries its fields NON-enumerably, so a raw
 * `console.error('[ctx]', error)` renders `{}` — an error report that names no
 * error. Every Server Action failure funnels through `logActionError`
 * (`lib/utils/captureError.ts`) and every API 500 through `loggedServerError`
 * (`app/api/helpers/response.ts`), so those two functions are the first
 * surface that must never log a raw DB-shaped error object — and then a
 * codebase-wide sweep below extends the same rule to EVERY other
 * `console.error(...)` call in app/, lib/, components/, hooks/ and services/,
 * so a new hand-rolled `console.error('[x]', error)` outside the funnels fails
 * CI instead of silently rendering `{}` again.
 *
 * Both funnels flatten DB-shaped errors via `describeDbError` — `logActionError`
 * through the shared `formatErrorForLog`, `loggedServerError` through an
 * `isDbErrorShape` gate — while ALWAYS handing the ORIGINAL error to
 * `captureServerError`, because Sentry's SQLSTATE fingerprinting and
 * redaction rules are written against the raw object.
 *
 * This is pinned at the source level, like the sibling `sentry-config` and
 * `csp-dev-image-origin` suites: the behavior is already unit-tested
 * (`captureError.test.ts`, `response.test.ts`), and this test exists for the
 * silent-regression case — an edit that drops the flattening keeps every unit
 * test green unless someone remembers to re-write the behavior tests, while
 * the `{}` console noise comes back across all ~300 log call sites. The sweep
 * is parsed with the TypeScript compiler (not regex) so it sees multi-line
 * calls, nested parens and optional chains exactly as the runtime does.
 */

import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../..');
const read = (relative: string) => readFileSync(join(ROOT, relative), 'utf8');

const captureErrorSrc = read('lib/utils/captureError.ts');
const responseSrc = read('app/api/helpers/response.ts');
const describeDbErrorSrc = read('lib/utils/describeDbError.ts');

/**
 * Strip comments before any "this string must not appear" sweep. The funnels
 * deliberately EXPLAIN the flattening by name (`describeDbError`,
 * `formatErrorForLog`), and a sweep that fails on its own explanation teaches
 * the next person to delete the explanation — the opposite of its purpose.
 */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/** The body of a top-level function, for sweeps scoped to its own code. */
const functionBody = (source: string, name: string): string =>
  source.match(
    new RegExp(
      `export function ${name}\\([\\s\\S]*?\\)[^{]*\\{([\\s\\S]*?)\\n\\}`,
    ),
  )?.[1] ?? '';

const logActionErrorBody = functionBody(captureErrorSrc, 'logActionError');
const loggedServerErrorBody = functionBody(responseSrc, 'loggedServerError');

/** The exact raw-log pattern this suite exists to forbid. */
const RAW_CONSOLE_ERROR = /console\.error\([^)]*,\s*error\s*\)/;

describe('the shared formatter (formatErrorForLog)', () => {
  it('flattens DB-shaped errors through describeDbError', () => {
    expect(describeDbErrorSrc).toContain(
      'return isDbErrorShape(error) ? describeDbError(error) : error;',
    );
  });

  it('defines isDbErrorShape to exclude real Error instances', () => {
    // A real Error renders fine in console.error (it has a stack); flattening
    // it would strip that stack for no gain. Only plain objects carrying the
    // SQLSTATE code / message are DB-shaped.
    expect(describeDbErrorSrc).toContain('!(error instanceof Error)');
    expect(describeDbErrorSrc).toMatch(
      /\('code' in error \|\| 'message' in error\)/,
    );
  });
});

describe('Server Action funnel — logActionError', () => {
  it('imports the shared formatter, not a hand-rolled copy', () => {
    // A second local flattening could drift from the shared one; the funnel
    // must use THE formatter this suite pins above.
    expect(captureErrorSrc).toContain(
      "import { formatErrorForLog } from './describeDbError';",
    );
  });

  it('logs through formatErrorForLog, never the raw error', () => {
    // Exact line, so reverting to `console.error(`[${action}]`, error)` fails
    // this contract instead of silently bringing back `{}` at ~300 call sites.
    expect(captureErrorSrc).toContain(
      'console.error(`[${action}]`, formatErrorForLog(error));',
    );
    expect(stripComments(logActionErrorBody)).not.toMatch(RAW_CONSOLE_ERROR);
  });

  it('still reports the ORIGINAL error to Sentry', () => {
    // The flattening is console-only; Sentry's fingerprinting (code/SQLSTATE
    // grouping) is written against the raw object and must not receive the
    // flattened copy.
    expect(logActionErrorBody).toContain(
      'captureServerError(action, error, undefined, userId);',
    );
  });
});

describe('API 500 funnel — loggedServerError', () => {
  it('imports describeDbError and isDbErrorShape from the shared module', () => {
    expect(responseSrc).toContain(
      "import { describeDbError, isDbErrorShape } from '@/lib/utils/describeDbError';",
    );
  });

  it('routes DB-shaped errors through describeDbError', () => {
    expect(loggedServerErrorBody).toContain(
      'const dbError = isDbErrorShape(error) ? describeDbError(error) : undefined;',
    );
  });

  it('logs the flattened dbError, never the raw error object', () => {
    expect(loggedServerErrorBody).toContain(
      'console.error(`[${context}]`, dbError);',
    );
    expect(stripComments(loggedServerErrorBody)).not.toMatch(RAW_CONSOLE_ERROR);
  });

  it('still reports the ORIGINAL error to Sentry', () => {
    expect(loggedServerErrorBody).toContain(
      'captureServerError(context, error, undefined, userId);',
    );
  });
});

describe('codebase-wide sweep — no raw DB-shaped error reaches console.error', () => {
  /**
   * Roots the sweep walks. The two funnels above are excluded: they are pinned
   * line-by-line by the dedicated describes, and `loggedServerError` logs the
   * ALREADY-flattened `dbError` (whose name would trip the identifier rule
   * below if it were swept too).
   */
  const SWEEP_ROOTS = ['app', 'lib', 'components', 'hooks', 'services'];
  const FUNNEL_FILES = new Set([
    'lib/utils/captureError.ts',
    'app/api/helpers/response.ts',
  ]);
  const SKIP_DIRS = new Set([
    'node_modules',
    '.next',
    '.claude',
    '__tests__',
    '__test__',
  ]);

  const collectTsFiles = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(join(ROOT, dir))) {
      const full = join(dir, entry);
      const stat = statSync(join(ROOT, full));
      if (stat.isDirectory()) {
        if (!SKIP_DIRS.has(entry)) out.push(...collectTsFiles(full));
      } else if (
        /\.(ts|tsx)$/.test(entry) &&
        !/\.test\.(ts|tsx)$/.test(entry) &&
        !FUNNEL_FILES.has(full)
      ) {
        out.push(full);
      }
    }
    return out;
  };

  /**
   * True when this argument is a raw DB-error-shaped expression: a bare
   * identifier named `error`/`err`/`dbError` or ending in `Error`, or a member
   * access ending in `.error` (e.g. `result.error`, `notify.error`). Wrapped
   * calls (`formatErrorForLog(...)`, `describeDbError(...)`) and scalar
   * accesses (`.message`, `.hint`, `.details`, `.code`, `.name`) are safe and
   * excluded. Parens / `as` casts / non-null assertions are unwrapped first.
   */
  const isRawErrorArg = (node: ts.Expression): boolean => {
    let n = node;
    while (
      ts.isParenthesizedExpression(n) ||
      ts.isAsExpression(n) ||
      ts.isTypeAssertionExpression(n) ||
      ts.isNonNullExpression(n)
    ) {
      n = n.expression;
    }
    if (ts.isCallExpression(n)) return false; // wrapped in something — safe
    if (ts.isPropertyAccessExpression(n)) {
      const name = n.name.text;
      if (['message', 'hint', 'details', 'code', 'name'].includes(name)) {
        return false; // scalar string — renders fine
      }
      return name === 'error'; // result.error / notify.error — PostgrestError
    }
    if (ts.isIdentifier(n)) {
      const text = n.text;
      if (text === 'error' || text === 'err' || text === 'dbError') return true;
      return /^[A-Za-z]+Error$/.test(text); // insertError, claimError, ...
    }
    return false;
  };

  const files = SWEEP_ROOTS.flatMap(collectTsFiles);

  it('sweeps a meaningful slice of the codebase', () => {
    // Self-check: if the walk ever stops matching files (renamed root, typo),
    // this fails loudly instead of silently sweeping nothing.
    expect(files.length).toBeGreaterThan(500);
  });

  it(
    'finds every console.error call and flags no raw DB-shaped argument',
    // The sweep parses ~700 files with the TS compiler; under full-suite CPU
    // contention it needs more than vitest's 5s default.
    { timeout: 30_000 },
    () => {
      const violations: string[] = [];
      let callCount = 0;

      for (const file of files) {
        const src = read(file);
        const sf = ts.createSourceFile(
          file,
          src,
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.TSX,
        );

        const visit = (node: ts.Node) => {
          if (ts.isCallExpression(node)) {
            const callee = node.expression;
            if (
              ts.isPropertyAccessExpression(callee) &&
              callee.expression.getText(sf) === 'console' &&
              callee.name.text === 'error'
            ) {
              callCount++;
              for (const arg of node.arguments) {
                if (isRawErrorArg(arg)) {
                  const { line } = sf.getLineAndCharacterOfPosition(
                    arg.getStart(sf),
                  );
                  violations.push(
                    `${file}:${line + 1} console.error(... ${arg.getText(sf)})`,
                  );
                }
              }
            }
          }
          ts.forEachChild(node, visit);
        };
        visit(sf);
      }

      // Self-check: the sweep must actually be exercising the pattern. If the
      // AST shape ever changes (e.g. a wrapper around console.error), this
      // catches it instead of passing because zero calls were found.
      expect(callCount).toBeGreaterThan(100);
      expect(violations).toEqual([]);
    },
  );
});
