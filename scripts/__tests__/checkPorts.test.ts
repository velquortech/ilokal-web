import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  chmodSync,
  readFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = process.cwd();
const SCRIPT = join(ROOT, 'scripts/check-ports.sh');

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'checkports-'));
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** A stand-in for `netsh.exe`. Windows emits CRLF, so the stub does too. */
function stubNetsh(name: string, body: string): string {
  const path = join(dir, name);
  const crlf = body.replace(/\n/g, '\r\n');
  writeFileSync(
    path,
    `#!/bin/sh\nprintf '%s' '${crlf.replace(/'/g, "'\\''")}'\n`,
  );
  chmodSync(path, 0o755);
  return path;
}

function config(name: string, body: string): string {
  const path = join(dir, name);
  writeFileSync(path, body);
  return path;
}

/** Runs the script and returns its exit code plus combined output. */
function run(netsh: string, cfg: string): { code: number; out: string } {
  try {
    const out = execFileSync('bash', [SCRIPT], {
      env: {
        ...process.env,
        SUPABASE_PORTCHECK_NETSH: netsh,
        SUPABASE_CONFIG: cfg,
      },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, out };
  } catch (error) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? -1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

// The real thing, verbatim from the machine that hit this.
const REAL_NETSH_OUTPUT = `
Protocol tcp Port Exclusion Ranges

Start Port    End Port
----------    --------
     50000       50059     *
     54119       54218
     54219       54318
     54319       54418
     54419       54518
     55914       56013

* - Administered port exclusions.
`;

const REAL_CONFIG = `
[api]
port = 54321
[db]
port = 54322
shadow_port = 54320
[db.pooler]
port = 54329
[studio]
port = 54323
[inbucket]
port = 54324
# smtp_port = 54325
# pop3_port = 54326
[analytics]
port = 54327
`;

describe('check-ports.sh — the failure it exists to translate', () => {
  it('names every blocked port and the range holding them', () => {
    const { code, out } = run(
      stubNetsh('netsh-real', REAL_NETSH_OUTPUT),
      config('config-real.toml', REAL_CONFIG),
    );
    expect(code).toBe(1);
    // 54319-54418 swallows the whole stack.
    expect(out).toContain('54320,54321,54322,54323,54324,54327,54329');
    expect(out).toContain('54319-54418');
  });

  it('computes the reservation span from the config rather than hardcoding it', () => {
    // Someone moving a port must not have to remember to edit the script.
    const { out } = run(
      stubNetsh('netsh-real2', REAL_NETSH_OUTPUT),
      config('config-real2.toml', REAL_CONFIG),
    );
    expect(out).toContain('startport=54320 numberofports=10');
  });

  it('spells out the command that actually fixes it', () => {
    const { out } = run(
      stubNetsh('netsh-real3', REAL_NETSH_OUTPUT),
      config('config-real3.toml', REAL_CONFIG),
    );
    expect(out).toContain('net stop winnat');
    expect(out).toContain('store=persistent');
    // The add fails while WinNAT holds the range, so the order is load-bearing.
    expect(out.indexOf('net stop winnat')).toBeLessThan(
      out.indexOf('netsh int ipv4 add excludedportrange'),
    );
  });

  it('ignores COMMENTED-OUT ports', () => {
    // `# smtp_port = 54325` is never bound. Reporting it would send someone
    // reserving a port nothing wants.
    const { out } = run(
      stubNetsh('netsh-c', REAL_NETSH_OUTPUT),
      config('config-c.toml', REAL_CONFIG),
    );
    expect(out).not.toContain('54325');
    expect(out).not.toContain('54326');
  });
});

/**
 * 🔴 The contract. This is a diagnostic, never a gate: it may only fail when it
 * can positively name a blocked port. A preflight that can produce a false
 * "your ports are blocked" gets worked around instead of read.
 */
describe('check-ports.sh — never blocks a working setup', () => {
  it('exits 0 when no reserved range overlaps the stack', () => {
    const clear = `
Protocol tcp Port Exclusion Ranges

Start Port    End Port
----------    --------
     50000       50059     *
     60000       60099
`;
    const { code, out } = run(
      stubNetsh('netsh-clear', clear),
      config('config-clear.toml', REAL_CONFIG),
    );
    expect(code).toBe(0);
    expect(out.trim()).toBe('');
  });

  it('exits 0 when a range abuts the stack without covering it', () => {
    // Off-by-one on either side is the boundary worth pinning: 54319 ends one
    // below the lowest port, 54330 starts one above the highest.
    const abut = `
Start Port    End Port
----------    --------
     54219       54319
     54330       54430
`;
    const { code } = run(
      stubNetsh('netsh-abut', abut),
      config('config-abut.toml', REAL_CONFIG),
    );
    expect(code).toBe(0);
  });

  it('catches a range that covers exactly one port', () => {
    const single = `
Start Port    End Port
----------    --------
     54322       54322
`;
    const { code, out } = run(
      stubNetsh('netsh-single', single),
      config('config-single.toml', REAL_CONFIG),
    );
    expect(code).toBe(1);
    expect(out).toContain('54322');
    expect(out).not.toContain('54321,');
  });

  it('exits 0 when netsh is absent', () => {
    const { code, out } = run(
      join(dir, 'does-not-exist'),
      config('config-a.toml', REAL_CONFIG),
    );
    expect(code).toBe(0);
    expect(out.trim()).toBe('');
  });

  it('exits 0 when netsh output has no parseable ranges', () => {
    const { code } = run(
      stubNetsh('netsh-junk', 'The following helper DLL cannot be loaded.\n'),
      config('config-j.toml', REAL_CONFIG),
    );
    expect(code).toBe(0);
  });

  it('exits 0 when netsh fails outright', () => {
    const path = join(dir, 'netsh-fail');
    writeFileSync(path, '#!/bin/sh\nexit 1\n');
    chmodSync(path, 0o755);
    expect(run(path, config('config-f.toml', REAL_CONFIG)).code).toBe(0);
  });

  it('exits 0 when the config is unreadable or declares no ports', () => {
    expect(
      run(stubNetsh('netsh-x', REAL_NETSH_OUTPUT), join(dir, 'nope.toml')).code,
    ).toBe(0);
    expect(
      run(
        stubNetsh('netsh-y', REAL_NETSH_OUTPUT),
        config('config-empty.toml', '[api]\nenabled = true\n'),
      ).code,
    ).toBe(0);
  });
});

describe('the Makefile actually calls it', () => {
  const makefile = readFileSync(join(ROOT, 'Makefile'), 'utf8');

  it('runs the check before every `supabase start`', () => {
    // The point is to fail BEFORE Docker does. A check that runs after is a
    // check that never runs.
    const lines = makefile.split('\n');
    const starts = lines
      .map((line, i) => ({ line, i }))
      .filter(({ line }) => line.includes('yarn supabase start'))
      .filter(({ line }) => !line.trimStart().startsWith('#'))
      .filter(({ line }) => !line.includes('echo'));

    expect(starts.length).toBeGreaterThan(0);
    for (const { i } of starts) {
      const preceding = lines.slice(Math.max(0, i - 12), i).join('\n');
      expect(preceding).toContain('check-ports.sh');
    }
  });

  it('exposes a standalone target', () => {
    expect(makefile).toMatch(/^check-ports:/m);
  });
});
