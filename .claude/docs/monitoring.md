# Error monitoring (Sentry)

**Sentry answers "what broke, for whom, and where". It is NOT product
analytics.** Pageviews, funnels, retention and platform growth come from
`view_events` and the `analytics_*` RPCs. Do not add product events to Sentry —
the two stores drift, and then neither is trusted.

Setup history and the full decision log: `.claude/SENTRY_MONITORING.md` (local,
not committed) — this file is the standing reference and stands on its own.

## The layout

| File                           | Runtime | Loaded by                                                       |
| ------------------------------ | ------- | --------------------------------------------------------------- |
| `instrumentation.ts`           | —       | Next, at server boot. `register()` dispatches on `NEXT_RUNTIME` |
| `sentry.server.config.ts`      | node    | route handlers, Server Actions, RSC                             |
| `sentry.edge.config.ts`        | edge    | `proxy.ts`                                                      |
| `instrumentation-client.ts`    | browser | Next loads it directly — never import it                        |
| `lib/utils/monitoring.ts`      | —       | the redaction + drop rules, as pure functions                   |
| `lib/utils/captureError.ts`    | server  | `logActionError` — the Server Action funnel                     |
| `app/api/helpers/response.ts`  | server  | `loggedServerError` — the API 500 funnel                        |
| `lib/utils/describeDbError.ts` | server  | `formatErrorForLog` — the log-line idiom (below)                |

## How an error gets reported

Three paths, and only the first is automatic:

1. **Thrown and uncaught** — `onRequestError` in `instrumentation.ts`.
2. **An API 500** — `loggedServerError(context, error)`. One edit covers ~60
   call sites; the `context` string becomes the Sentry tag.
3. **A Server Action** — `logActionError(actionName, error)`. **Nothing here is
   automatic**: an action catches its own error and returns
   `{ success: false, error: { code } }`, so it never throws and
   `onRequestError` never sees it.

**When you write a new Server Action, its catch block must call
`logActionError`.** A contract test sweeps every `console.error(...)` across
`app/`, `lib/`, `components/`, `hooks/` and `services/` for raw DB-shaped
error arguments (see the sweep below) and fails if one reappears — but it can
only catch calls that log the error object, so a catch that logs nothing at
all still reports nothing.

## Log lines must be readable: the `formatErrorForLog` idiom

`PostgrestError` carries its fields (`code`, `message`, `details`, `hint`)
NON-enumerably, so `console.error('[ctx]', error)` prints `{}` — an error
report that names no error. This is how the missing-RPC failure
(`PGRST202`) first surfaced in production as
`[getPublicBusinessProfile rating] {}`. **Every raw DB-shaped error you log
must go through `formatErrorForLog(error)` from
`lib/utils/describeDbError.ts`** — never the raw object, never a hand-rolled
flattening.

`formatErrorForLog` is the ONE idiom for every console log line that may carry
a DB error:

- **DB-shaped errors** (plain objects carrying `code`/`message` — exactly
  `PostgrestError`) are flattened to `{ code, message, details?, hint? }`,
  which reads in a log stream and preserves the SQLSTATE for grepping.
- **Everything else passes through untouched.** A real `Error` keeps its stack
  (wrapping it in `formatErrorForLog` is a no-op), a redirect/notFound digest
  keeps its shape. So it is ALWAYS safe to wrap — there is no case where
  wrapping changes behaviour for the worse.
- **Scalar accesses are fine unwrapped**: `error.message`, `error?.hint`,
  `result.code` render as strings and need no wrapper.

`describeDbError` is **server-side logging only** — the flattened text names
tables, columns and constraints, so it must never appear in a client response.
`loggedServerError` already returns a generic 500 for exactly this reason.

### The two funnels share it

Both capture funnels flatten through the same helpers so their log lines read
alike, and neither can drift from the shared idiom:

- **`logActionError(action, error)`** (Server Actions) logs
  `formatErrorForLog(error)` — real `Error` instances keep their stack,
  redirect digests keep theirs, only the unreadable `{}` case changes shape.
  The console line stays `[action] <flattened>` — that is what people grep in
  a hosting provider's log stream.
- **`loggedServerError(context, error)`** (API 500s) computes
  `isDbErrorShape(error) ? describeDbError(error) : undefined` and logs the
  flattened object when present, falling back to the legacy `[context] message`
  string shape otherwise.

**Both funnels always hand the ORIGINAL error to `captureServerError`.** The
flattening is console-only: Sentry's fingerprinting (`code`/SQLSTATE grouping)
and the redaction rules in `monitoring.ts` are written against the raw object.

### The contract test that keeps it true

`__test__/config/error-log-funnels.contract.test.ts` pins this at the source
level, so a regression fails CI instead of silently bringing `{}` back:

- **The funnels** — exact source lines: `logActionError` imports the shared
  `formatErrorForLog` (not a hand-rolled copy), logs through it, never logs the
  raw error; `loggedServerError` imports `describeDbError` + `isDbErrorShape`
  from the shared module, computes the flattened `dbError`, and logs that.
- **A codebase-wide sweep** — every `console.error(...)` in `app/`, `lib/`,
  `components/`, `hooks/` and `services/` is parsed with the TypeScript
  compiler (not regex, so multi-line calls and nested parens are seen exactly
  as the runtime sees them) and any argument that is a bare
  `error`/`err`/`dbError`/`*Error` identifier or a `.error` member access —
  not wrapped in `formatErrorForLog`/`describeDbError` — fails the test with
  the file and line. The two funnel files are excluded (they are pinned
  line-by-line by the dedicated describes).
- **Self-checks both directions**: the sweep asserts it walked > 500 files and
  saw > 100 console.error calls, so a broken walk or a renamed root fails
  loudly instead of passing by sweeping nothing.

**Rule of thumb: when you write `console.error('[ctx]', error)` in new code,
write `console.error('[ctx]', formatErrorForLog(error))` instead.** If the
sweep ever flags a site, the fix is the same one-liner — wrap it.

## Rules

- **Never `sendDefaultPii: true`.** This app stores emails, phone numbers,
  addresses, uploaded licence and tax documents, and live cashier redemption
  codes.
- **Scrub through `lib/utils/monitoring.ts`, not inline.** Those rules decide
  what leaves the server for a third party, so they are the part that must be
  unit-tested. They import nothing from the SDK for exactly that reason.
- **Redaction is by key SEGMENT** (`phone_number`, `token_hash`,
  `contact_email`, `x-api-key`), covering snake_case, kebab-case and camelCase.
- **`code` is special.** It is redacted only when the value also has the cashier
  code's shape (6–7 chars from an alphabet excluding `0`, `1`, `I`, `L`, `O`),
  because `code` is also where a Postgres SQLSTATE (`42P01`) and the app's own
  `VALIDATION_ERROR` live. In a **URL** it is redacted unconditionally — there
  `?code=` is the PKCE authorization code.
- **Expected throws are dropped**: `redirect()`, `notFound()`, `AbortError`.
  Every `redirect()` in the app throws, and the proxy redirects on every
  unauthenticated navigation — unfiltered they outnumber real errors.
- **The SDK is imported dynamically behind a DSN check** in `captureError.ts`.
  A static import would pull it into every API-route and action test, and the
  suite must stay offline. Keep it that way.

## Transport

Browser events go through the **same-origin `/monitoring` tunnel**
(`tunnelRoute`), not directly to the ingest host. The CSP in `next.config.ts` is
hand-maintained and `connect-src` names only first-party and Supabase origins —
the tunnel means it needs no Sentry entry at all, so a CSP edit cannot silently
break reporting. It also survives ad-blockers, which block ingest hosts by name.

The tunnel is an **unauthenticated POST that forwards to Sentry**, so `proxy.ts`
rate-limits it by IP before anything is forwarded (60/60s, env-tunable). Its
path appears in three places that must stay in lockstep — `tunnelRoute`,
`SENTRY_TUNNEL_PATH`, and the proxy matcher — and a contract test asserts all
three.

## Environment

Server: `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`,
`SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_EDGE_TRACES_SAMPLE_RATE`.
Browser: the `NEXT_PUBLIC_SENTRY_*` equivalents.
**Never cross the two** — a `NEXT_PUBLIC_` prefix inlines the value into every
visitor's bundle.

**No DSN ⇒ the SDK is disabled**, which is what keeps dev and CI silent. There
is no half-configured state.

**Build-time only:** `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`. A
missing token **fails open** — the build succeeds and uploads nothing, so every
production stack trace stays minified with no error anywhere. Check this after
the first deploy; it is the one failure that looks like success.

## Not shipped, deliberately

- **Session Replay.** It records the DOM of a real owner's dashboard — coupon
  codes, customer names, phone numbers. That is a product and legal decision,
  not a config default.
- **`Sentry.setUser`.** Setting it without verified per-request isolation risks
  attributing one user's id to another user's event, which is worse than the
  missing field. Needs a live DSN and a deployed instance to verify.
