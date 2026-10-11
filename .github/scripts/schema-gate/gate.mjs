#!/usr/bin/env node
/* global console, process */
/**
 * Schema gate: fail a PR whose code reads database objects production does
 * not have.
 *
 * Why: on 2026-10-09 the migration deploy started failing (an invalid
 * SUPABASE_ACCESS_TOKEN) while Vercel kept shipping code. #93 went live
 * reading a table production never got, and the registration stack (#87/#89)
 * would have taken down the mobile feed and shop pages the same way. Nothing
 * in CI compared what the code reads with what production has.
 *
 * What it reads from the code (TypeScript AST, no type-checker needed):
 *   - `.from('t')` tables, and the columns used on them: top-level `.select()`
 *     columns, filter/order columns, insert/update/upsert keys, `onConflict`.
 *     Queries built across statements (`q = q.eq('c', …)`) are followed
 *     through the variable. A column whose table cannot be traced (a callback
 *     param) must exist on SOME table.
 *   - `.rpc('fn', { args })`: the function, and — when the args are an object
 *     literal — that production's function accepts exactly those names.
 *   Skipped: `storage.from('bucket')`, `Array.from`, dynamic names, embedded
 *   resources inside select() (other tables, resolved by FK at runtime).
 *
 * Decision, for references NEW in the PR (head vs the merge-base with main):
 *   1. missing on production and not mentioned by a migration the PR adds
 *        -> BLOCK (that code can never work)
 *   2. missing, but the PR's own migrations create it
 *        -> allow only if production already has every migration on main
 *           (a healthy pipeline). Otherwise BLOCK: merging ships the code
 *           while its migration sits behind the backlog.
 *   3. production unreadable (no/invalid token, fork PR)
 *        -> BLOCK only if the PR adds references or migrations
 *   References that already exist on main and are missing on production are
 *   reported as warnings: they are not this PR's to fix, and blocking on them
 *   would freeze every unrelated PR.
 *
 * Usage:
 *   node gate.mjs extract <dir>                  -> refs JSON on stdout
 *   node gate.mjs check --head <dir> --base <dir> --schema <file|"unavailable">
 *                       [--added-migrations <file>] [--base-migrations <file>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(path.join(process.cwd(), 'package.json'));
const ts = require('typescript');

const SOURCE_DIRS = [
  'app',
  'lib',
  'components',
  'hooks',
  'helpers',
  'providers',
  'config',
];
const SKIP_PATH =
  /(^|\/)(__tests__|node_modules|\.next)(\/|$)|\.(test|spec)\.tsx?$|lib\/types\/database\.ts$/;
const FILTER_METHODS = new Set([
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'like',
  'ilike',
  'likeAllOf',
  'likeAnyOf',
  'ilikeAllOf',
  'ilikeAnyOf',
  'is',
  'in',
  'contains',
  'containedBy',
  'rangeGt',
  'rangeGte',
  'rangeLt',
  'rangeLte',
  'rangeAdjacent',
  'overlaps',
  'textSearch',
  'not',
  'filter',
  'order',
]);
const WRITE_METHODS = new Set(['insert', 'update', 'upsert']);

// ── extraction ──────────────────────────────────────────────────────────────

function listFiles(root) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      const rel = path.relative(root, full);
      if (SKIP_PATH.test(rel)) continue;
      if (e.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(e.name)) out.push(full);
    }
  };
  for (const d of SOURCE_DIRS) walk(path.join(root, d));
  return out;
}

const literal = (node) =>
  node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : undefined;

/** Top-level column names of a PostgREST select string. */
export function selectColumns(sel) {
  const cols = [];
  let depth = 0;
  let cur = '';
  const flush = () => {
    const tok = cur.trim();
    cur = '';
    if (!tok || tok === '*' || tok.includes('(') || tok.startsWith('...'))
      return;
    // alias:column, column::cast, json->path
    let name =
      tok.includes(':') && !tok.includes('::') ? tok.split(':').pop() : tok;
    name = name.split('::')[0].split('->')[0].trim();
    if (/^[a-z_][a-z0-9_]*$/i.test(name)) cols.push(name);
  };
  for (const ch of sel) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) flush();
    else if (depth > 0 || ch !== ',') cur += ch;
  }
  flush();
  return cols;
}

/** A filter's column argument: plain names only (no `rel.col`, json paths cut). */
function filterColumn(raw) {
  if (raw == null) return undefined;
  const name = raw.split('->')[0].trim();
  return /^[a-z_][a-z0-9_]*$/i.test(name) ? name : undefined;
}

function objectKeys(node) {
  if (!node) return [];
  if (ts.isArrayLiteralExpression(node))
    return node.elements.flatMap(objectKeys);
  if (!ts.isObjectLiteralExpression(node)) return [];
  return node.properties.flatMap((p) => {
    if (
      (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) &&
      p.name
    ) {
      const n =
        ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)
          ? p.name.text
          : undefined;
      return n ? [n] : [];
    }
    return []; // spreads: unknown keys
  });
}

/** Leftmost expression of a call chain, and every call along it (inner first). */
function unwindChain(node) {
  const calls = [];
  let cur = node;
  for (;;) {
    if (
      ts.isCallExpression(cur) &&
      ts.isPropertyAccessExpression(cur.expression)
    ) {
      calls.unshift(cur);
      cur = cur.expression.expression;
    } else if (
      ts.isAwaitExpression(cur) ||
      ts.isParenthesizedExpression(cur) ||
      ts.isNonNullExpression(cur)
    ) {
      cur = cur.expression;
    } else break;
  }
  return { root: cur, calls };
}

const methodOf = (call) => call.expression.name.text;
const isStorage = (call) =>
  /(^|\.)storage$/.test(call.expression.expression.getText());

export function extractFile(file, root) {
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const rel = path.relative(root, file);
  const refs = [];
  // identifier -> table, for queries built across statements. Keyed by the
  // enclosing function too: two functions in one file both calling their
  // builder `query` are different queries. A variable holding an RPC result
  // (a set-returning function used as a relation) maps to RPC_RESULT — its
  // filters name the function's OUTPUT columns, which are not table columns.
  const varTable = new Map();
  const RPC_RESULT = Symbol('rpc-result');
  const scopeOf = (n) => {
    for (let p = n.parent; p; p = p.parent)
      if (ts.isFunctionLike(p)) return p.pos;
    return -1;
  };
  const bind = (node, value) => {
    const p = node.parent;
    let id;
    if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name))
      id = p.name;
    else if (
      p &&
      ts.isBinaryExpression(p) &&
      p.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(p.left)
    )
      id = p.left;
    if (!id) return;
    const key = `${scopeOf(p)}:${id.text}`;
    // Re-assigning from the same query keeps the binding; anything else is a
    // different (unknown) value.
    if (value !== undefined || !varTable.has(key)) varTable.set(key, value);
    else if (value === undefined && !isContinuation(node, id.text))
      varTable.set(key, undefined);
  };
  const isContinuation = (node, name) => {
    const { root } = unwindChain(node);
    return ts.isIdentifier(root) && root.text === name;
  };
  const lookup = (id) => varTable.get(`${scopeOf(id)}:${id.text}`);
  const where = (n) =>
    `${rel}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`;

  const recordChain = (calls, table, at) => {
    for (const call of calls) {
      const m = methodOf(call);
      const [a0, a1] = call.arguments;
      const add = (column) =>
        column && refs.push({ kind: 'column', table, column, at: where(call) });
      if (m === 'select') selectColumns(literal(a0) ?? '').forEach(add);
      else if (FILTER_METHODS.has(m)) add(filterColumn(literal(a0)));
      else if (m === 'match') objectKeys(a0).forEach(add);
      else if (WRITE_METHODS.has(m)) {
        objectKeys(a0).forEach(add);
        if (a1 && ts.isObjectLiteralExpression(a1)) {
          for (const p of a1.properties) {
            if (
              ts.isPropertyAssignment(p) &&
              p.name.getText() === 'onConflict'
            ) {
              (literal(p.initializer) ?? '')
                .split(',')
                .map((s) => s.trim())
                .forEach((c) => add(filterColumn(c)));
            }
          }
        }
      }
    }
    void at;
  };

  const visit = (node) => {
    // Outermost call of a chain only: inner calls are reached by unwinding.
    if (
      ts.isCallExpression(node) &&
      !(
        ts.isPropertyAccessExpression(node.parent) &&
        ts.isCallExpression(node.parent.parent)
      )
    ) {
      const { root: base, calls } = unwindChain(node);
      const fromIdx = calls.findIndex(
        (c) =>
          methodOf(c) === 'from' &&
          !isStorage(c) &&
          literal(c.arguments[0]) !== undefined,
      );
      const rpcIdx = calls.findIndex(
        (c) => methodOf(c) === 'rpc' && literal(c.arguments[0]) !== undefined,
      );
      if (
        fromIdx >= 0 &&
        /(^|\.)(storage)$/.test(
          calls[fromIdx].expression.expression.getText(),
        ) === false
      ) {
        const fromCall = calls[fromIdx];
        // `Array.from('x')` never takes a string; an identifier receiver named
        // Array would, so rule it out explicitly.
        if (fromCall.expression.expression.getText() !== 'Array') {
          const table = literal(fromCall.arguments[0]);
          refs.push({ kind: 'table', table, at: where(fromCall) });
          recordChain(calls.slice(fromIdx + 1), table);
          bind(node, table); // `const q = supabase.from('t')…` / `q = …from('t')…`
        }
      } else if (rpcIdx >= 0) {
        const c = calls[rpcIdx];
        const argsNode = c.arguments[1];
        const args =
          argsNode &&
          ts.isObjectLiteralExpression(argsNode) &&
          argsNode.properties.every(
            (pr) =>
              ts.isPropertyAssignment(pr) ||
              ts.isShorthandPropertyAssignment(pr),
          )
            ? objectKeys(argsNode)
            : argsNode
              ? null
              : [];
        refs.push({
          kind: 'rpc',
          fn: literal(c.arguments[0]),
          args,
          at: where(c),
        });
        bind(node, RPC_RESULT);
      } else if (calls.length && ts.isIdentifier(base)) {
        // A chain continuing a query held in a variable.
        const table = lookup(base);
        if (table === RPC_RESULT) {
          // filters on a set-returning function's output: not checkable here
        } else if (typeof table === 'string') recordChain(calls, table);
        else if (
          !varTable.has(`${scopeOf(base)}:${base.text}`) &&
          calls.some(
            (c) => FILTER_METHODS.has(methodOf(c)) || methodOf(c) === 'select',
          )
        ) {
          // Untraceable receiver (a callback's `q`): only treat it as a query
          // when the chain looks like one, and require the column on SOME table.
          if (/^(q|query|qb|builder)$/i.test(base.text))
            recordChain(calls, null);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return refs;
}

export function extract(root) {
  return listFiles(root).flatMap((f) => extractFile(f, root));
}

// ── comparison ──────────────────────────────────────────────────────────────

const keyOf = (r) =>
  r.kind === 'table'
    ? `table ${r.table}`
    : r.kind === 'column'
      ? `column ${r.table ?? '*'}.${r.column}`
      : `rpc ${r.fn}(${r.args === null ? '?' : [...r.args].sort().join(',')})`;

function indexSchema(schema) {
  const tables = new Map();
  const allColumns = new Set();
  for (const { table, column } of schema.columns) {
    if (!tables.has(table)) tables.set(table, new Set());
    tables.get(table).add(column);
    allColumns.add(column);
  }
  const fns = new Map();
  for (const f of schema.functions) {
    if (!fns.has(f.name)) fns.set(f.name, []);
    fns.get(f.name).push(f);
  }
  return { tables, allColumns, fns };
}

/** Why `ref` cannot work against `idx`, or null if it can. */
export function missingReason(ref, idx) {
  if (ref.kind === 'table')
    return idx.tables.has(ref.table)
      ? null
      : `table \`${ref.table}\` does not exist`;
  if (ref.kind === 'column') {
    if (ref.table === null)
      return idx.allColumns.has(ref.column)
        ? null
        : `column \`${ref.column}\` exists on no table`;
    if (!idx.tables.has(ref.table)) return null; // reported once, as the table
    return idx.tables.get(ref.table).has(ref.column)
      ? null
      : `column \`${ref.table}.${ref.column}\` does not exist`;
  }
  const overloads = idx.fns.get(ref.fn);
  if (!overloads) return `function \`${ref.fn}()\` does not exist`;
  if (ref.args === null) return null; // args not statically known
  const ok = overloads.some((f) => {
    const required = f.args.slice(0, f.args.length - f.defaults);
    return (
      ref.args.every((a) => f.args.includes(a)) &&
      required.every((a) => ref.args.includes(a))
    );
  });
  if (ok) return null;
  const sigs = overloads.map((f) => `(${f.args.join(', ')})`).join(' | ');
  return `function \`${ref.fn}\` takes ${sigs}, not (${ref.args.join(', ')})`;
}

/** The identifier a migration must mention to plausibly create `ref`. */
const objectName = (ref) =>
  ref.kind === 'table'
    ? ref.table
    : ref.kind === 'column'
      ? ref.column
      : ref.fn;

export function decide({
  headRefs,
  baseRefs,
  schema,
  addedMigrationsSql,
  baseMigrationVersions,
}) {
  const baseKeys = new Set(baseRefs.map(keyOf));
  const fresh = new Map();
  for (const r of headRefs)
    if (!baseKeys.has(keyOf(r)) && !fresh.has(keyOf(r))) fresh.set(keyOf(r), r);
  const newRefs = [...fresh.values()];
  const addsMigrations = addedMigrationsSql.trim().length > 0;

  if (!schema) {
    const blocked = newRefs.length > 0 || addsMigrations;
    return {
      ok: !blocked,
      unavailable: true,
      newRefs,
      blockers: [],
      covered: [],
      warnings: [],
      backlog: [],
      summary: blocked
        ? 'Production schema could not be read, and this PR adds database references or migrations, so it cannot be verified.'
        : 'Production schema could not be read; this PR adds no database references or migrations, so nothing to verify.',
    };
  }

  const idx = indexSchema(schema);
  const applied = new Set(schema.migrations);
  const backlog = baseMigrationVersions.filter((v) => !applied.has(v));
  const mentions = (name) =>
    new RegExp(`\\b${name.replace(/[^a-z0-9_]/gi, '')}\\b`, 'i').test(
      addedMigrationsSql,
    );

  const blockers = [];
  const covered = [];
  for (const r of newRefs) {
    const reason = missingReason(r, idx);
    if (!reason) continue;
    if (addsMigrations && mentions(objectName(r)))
      covered.push({ ref: r, reason });
    else blockers.push({ ref: r, reason });
  }
  if (covered.length && backlog.length) {
    for (const c of covered) {
      blockers.push({
        ...c,
        reason: `${c.reason} — this PR's migration creates it, but production is ${backlog.length} migration(s) behind main, so it would not be applied on merge`,
      });
    }
  }

  const warnings = [];
  const seen = new Set();
  for (const r of baseRefs) {
    const k = keyOf(r);
    if (seen.has(k)) continue;
    seen.add(k);
    const reason = missingReason(r, idx);
    if (reason) warnings.push({ ref: r, reason });
  }

  const ok = blockers.length === 0;
  return {
    ok,
    unavailable: false,
    newRefs,
    blockers,
    covered,
    warnings,
    backlog,
    summary: '',
  };
}

// ── reporting ───────────────────────────────────────────────────────────────

function report(result) {
  const lines = [];
  const loc = (r) => r.at;
  if (result.unavailable) {
    lines.push(
      `## Schema gate: ${result.ok ? '⚠️ not verified' : '❌ blocked'}`,
      '',
      result.summary,
    );
    if (!result.ok) {
      lines.push(
        '',
        'Check `SUPABASE_ACCESS_TOKEN` (the same secret the migration deploy uses).',
      );
      lines.push(
        '',
        `New database references in this PR: ${result.newRefs.length}.`,
      );
    }
  } else {
    lines.push(`## Schema gate: ${result.ok ? '✅ passed' : '❌ blocked'}`, '');
    lines.push(
      `Checked ${result.newRefs.length} database reference(s) this PR adds against production.`,
    );
    if (result.backlog.length) {
      lines.push(
        '',
        `⚠️ Production is **${result.backlog.length} migration(s) behind main** (${result.backlog.slice(0, 8).join(', ')}${result.backlog.length > 8 ? ', …' : ''}). The migration deploy is not keeping up; nothing that depends on a new migration can ship safely until it does.`,
      );
    }
    if (result.blockers.length) {
      lines.push('', '### Would break production', '');
      for (const b of result.blockers)
        lines.push(`- \`${loc(b.ref)}\` — ${b.reason}`);
    }
    if (result.covered.length && result.ok) {
      lines.push(
        '',
        '### Created by this PR’s migrations (applied on merge)',
        '',
      );
      for (const c of result.covered)
        lines.push(`- \`${loc(c.ref)}\` — ${c.reason}`);
    }
    if (result.warnings.length) {
      lines.push(
        '',
        `### Already on main and missing on production (${result.warnings.length}, not blocking this PR)`,
        '',
      );
      for (const w of result.warnings.slice(0, 20))
        lines.push(`- \`${loc(w.ref)}\` — ${w.reason}`);
    }
  }
  return lines.join('\n');
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

const [, , cmd, dirArg] = process.argv;
if (cmd === 'extract') {
  process.stdout.write(JSON.stringify(extract(path.resolve(dirArg)), null, 1));
} else if (cmd === 'check') {
  const schemaArg = arg('schema');
  let schema = null;
  if (schemaArg && schemaArg !== 'unavailable') {
    const raw = JSON.parse(fs.readFileSync(schemaArg, 'utf8'));
    // Management API returns rows; psql -tA returns the bare document.
    schema = Array.isArray(raw)
      ? typeof raw[0].schema === 'string'
        ? JSON.parse(raw[0].schema)
        : raw[0].schema
      : raw;
  }
  const readOr = (f, d) =>
    f && fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : d;
  const result = decide({
    headRefs: extract(path.resolve(arg('head'))),
    baseRefs: extract(path.resolve(arg('base'))),
    schema,
    addedMigrationsSql: readOr(arg('added-migrations'), ''),
    baseMigrationVersions: readOr(arg('base-migrations'), '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
  });
  const md = report(result);
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  for (const b of result.blockers) {
    const [file, line] = b.ref.at.split(':');
    console.log(`::error file=${file},line=${line}::${b.reason}`);
  }
  process.exit(result.ok ? 0 : 1);
} else if (cmd) {
  console.error(`unknown command: ${cmd}`);
  process.exit(2);
}
